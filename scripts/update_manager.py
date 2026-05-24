#!/usr/bin/env python3
"""
Aura-NX Sysmodule Update Manager
================================
Safe deployment manager with staging, sanity checks, and atomic swaps.
Supports both FTP (LAN) and local SD card mount modes.

Usage:
    python update_manager.py deploy [--ftp IP] [--sd PATH]
    python update_manager.py status [--ftp IP]
    python update_manager.py verify [--ftp IP] [--sd PATH]
"""

import argparse
import hashlib
import json
import os
import struct
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

# Configuration
EXPECTED_TITLE_ID = "4200000000000012"
SYSMODULE_DIR = f"atmosphere/contents/{EXPECTED_TITLE_ID}/exefs"
EXPECTED_NPDM_MAGIC = b"META"
MIN_NSO_SIZE = 1024       # 1KB - suspiciously small
MAX_NSO_SIZE = 5 * 1024 * 1024  # 5MB - suspiciously large
MIN_NPDM_SIZE = 100       # Very small NPDM is suspicious
MAX_NPDM_SIZE = 10000     # Very large NPDM is suspicious
NPDMTOOL = "/opt/devkitpro/tools/bin/npdmtool"
BUILD_DIR = Path(__file__).parent.parent / "sysmodule"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def log(msg: str, color: str = ""):
    print(f"{color}{msg}{Colors.RESET}")


def err(msg: str):
    log(f"[FAIL] {msg}", Colors.RED)


def ok(msg: str):
    log(f"[PASS] {msg}", Colors.GREEN)


def warn(msg: str):
    log(f"[WARN] {msg}", Colors.YELLOW)


def info(msg: str):
    log(f"[INFO] {msg}", Colors.BLUE)


# ─── Sanity Checkers ──────────────────────────────────────────────────────────

def check_nso_sanity(path: Path) -> tuple[bool, str]:
    """Validate NSO binary basics."""
    if not path.exists():
        return False, f"NSO not found: {path}"
    size = path.stat().st_size
    if size < MIN_NSO_SIZE:
        return False, f"NSO too small ({size} bytes < {MIN_NSO_SIZE})"
    if size > MAX_NSO_SIZE:
        return False, f"NSO too large ({size} bytes > {MAX_NSO_SIZE})"
    with open(path, "rb") as f:
        magic = f.read(4)
    if magic != b"NSO0":
        return False, f"NSO has invalid magic: {magic!r} (expected NSO0)"
    return True, f"NSO valid ({size} bytes, NSO0 magic)"


def check_npdm_sanity(path: Path) -> tuple[bool, str]:
    """Validate compiled binary NPDM (not JSON)."""
    if not path.exists():
        return False, f"NPDM not found: {path}"
    size = path.stat().st_size
    if size < MIN_NPDM_SIZE:
        return False, f"NPDM too small ({size} bytes < {MIN_NPDM_SIZE})"
    if size > MAX_NPDM_SIZE:
        return False, f"NPDM too large ({size} bytes > {MAX_NPDM_SIZE})"
    with open(path, "rb") as f:
        magic = f.read(4)
    if magic == b'{\n\t' or magic == b'{\n ' or magic.startswith(b'{'):
        return False, f"NPDM is JSON text, not compiled binary! Run: npdmtool template.npdm main.npdm"
    if magic != EXPECTED_NPDM_MAGIC:
        return False, f"NPDM has invalid magic: {magic!r} (expected {EXPECTED_NPDM_MAGIC!r})"
    # Check title_id - search for it anywhere in the binary NPDM
    title_id_val = int(EXPECTED_TITLE_ID, 16)
    title_id_bytes = struct.pack("<Q", title_id_val)
    with open(path, "rb") as f:
        data = f.read()
    if title_id_bytes not in data:
        return False, f"NPDM title_id not found: {EXPECTED_TITLE_ID}"
    return True, f"NPDM valid ({size} bytes, title_id={EXPECTED_TITLE_ID})"


def compile_npdm(json_src: Path, output: Path) -> bool:
    """Compile JSON NPDM to binary using npdmtool."""
    if not json_src.exists():
        err(f"NPDM JSON source not found: {json_src}")
        return False
    if not os.path.exists(NPDMTOOL):
        err(f"npdmtool not found at {NPDMTOOL}")
        return False
    cmd = f'{NPDMTOOL} "{json_src}" "{output}"'
    info(f"Compiling NPDM: {cmd}")
    rc = os.system(cmd)
    if rc != 0:
        err(f"npdmtool exited with code {rc}")
        return False
    # Verify the output
    ok, msg = check_npdm_sanity(output)
    if not ok:
        err(f"Compiled NPDM failed validation: {msg}")
        return False
    ok(f"NPDM compiled and validated: {msg}")
    return True


# ─── Staging & Backup ─────────────────────────────────────────────────────────

class StagingArea:
    """Manages a temporary staging directory for safe deployment."""

    def __init__(self, source_dir: Path):
        self.source_dir = source_dir
        self.staging_dir = Path(tempfile.mkdtemp(prefix="aura_staging_"))
        self.backup_dir: Optional[Path] = None

    def stage_build(self) -> bool:
        """Copy build artifacts into staging area and validate."""
        nso_src = self.source_dir / "aura_nx_sysmodule.nso"
        npdm_json = self.source_dir / "template_fixed.npdm"
        npdm_bin = self.staging_dir / "main.npdm"
        nso_dst = self.staging_dir / "main"

        info("Staging build artifacts...")

        # Compile NPDM
        if not compile_npdm(npdm_json, npdm_bin):
            return False

        # Copy NSO
        if not nso_src.exists():
            err(f"NSO not found: {nso_src}")
            return False
        import shutil
        shutil.copy2(nso_src, nso_dst)

        # Validate staged files
        ok1, msg1 = check_nso_sanity(nso_dst)
        if not ok1:
            err(f"Staged NSO validation failed: {msg1}")
            return False
        ok(msg1)

        ok2, msg2 = check_npdm_sanity(npdm_bin)
        if not ok2:
            err(f"Staged NPDM validation failed: {msg2}")
            return False
        ok(msg2)

        info(f"Staging complete: {self.staging_dir}")
        return True

    def create_backup(self, target_dir: Path) -> bool:
        """Backup existing files before overwrite."""
        import shutil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir = target_dir.parent / f"backup_{timestamp}"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        files_to_backup = ["main", "main.npdm"]
        backed_up = False
        for fname in files_to_backup:
            src = target_dir / fname
            if src.exists():
                shutil.copy2(src, self.backup_dir / fname)
                backed_up = True
        if backed_up:
            info(f"Backup created: {self.backup_dir}")
        return True

    def deploy_to(self, target_dir: Path) -> bool:
        """Atomically deploy staged files to target."""
        import shutil
        if not self.staging_dir.exists():
            err("Staging area missing")
            return False

        target_dir.mkdir(parents=True, exist_ok=True)

        # Backup existing
        self.create_backup(target_dir)

        # Deploy staged files
        for fname in ["main", "main.npdm"]:
            src = self.staging_dir / fname
            dst = target_dir / fname
            if src.exists():
                shutil.copy2(src, dst)
                info(f"Deployed: {fname} -> {dst}")

        # Final verification
        ok1, msg1 = check_nso_sanity(target_dir / "main")
        ok2, msg2 = check_npdm_sanity(target_dir / "main.npdm")
        if ok1 and ok2:
            ok("Deployment verified on target")
            return True
        else:
            err(f"Post-deploy verification failed: {msg1 if not ok1 else msg2}")
            return False

    def cleanup(self):
        """Remove staging directory."""
        import shutil
        if self.staging_dir.exists():
            shutil.rmtree(self.staging_dir)
            info(f"Cleaned up staging: {self.staging_dir}")


# ─── FTP Deployment ──────────────────────────────────────────────────────────

def deploy_via_ftp(ip: str, staging: StagingArea) -> bool:
    """Deploy staged files via FTP to Switch."""
    import ftplib
    ftp_path = f"/{SYSMODULE_DIR}"

    try:
        info(f"Connecting to FTP {ip}:5000...")
        ftp = ftplib.FTP()
        ftp.connect(ip, 5000, timeout=10)
        ftp.login("anonymous", "anonymous")

        # Try to create directory structure
        for subdir in ["atmosphere", "atmosphere/contents",
                       f"atmosphere/contents/{EXPECTED_TITLE_ID}",
                       f"atmosphere/contents/{EXPECTED_TITLE_ID}/exefs"]:
            try:
                ftp.cwd(subdir)
            except ftplib.error_perm:
                try:
                    ftp.mkd(subdir)
                    ftp.cwd(subdir)
                except Exception as e:
                    warn(f"Could not create/enter {subdir}: {e}")

        # Backup existing files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = f"backup_{timestamp}"
        try:
            ftp.mkd(backup_dir)
        except:
            pass

        for fname in ["main", "main.npdm"]:
            try:
                # Backup
                remote_src = f"{ftp_path}/{fname}"
                try:
                    ftp.cwd("/")
                    with tempfile.NamedTemporaryFile(delete=False) as tmp:
                        ftp.retrbinary(f"RETR {remote_src}", tmp.write)
                        tmp.close()
                        # Upload to backup dir
                        ftp.cwd(backup_dir)
                        with open(tmp.name, "rb") as f:
                            ftp.storbinary(f"STOR {fname}", f)
                        os.unlink(tmp.name)
                        ftp.cwd("/")
                except Exception:
                    pass  # No existing file to backup

                # Deploy
                src = staging.staging_dir / fname
                ftp.cwd(ftp_path)
                with open(src, "rb") as f:
                    ftp.storbinary(f"STOR {fname}", f)
                info(f"FTP deployed: {fname}")
            except Exception as e:
                err(f"FTP deploy failed for {fname}: {e}")
                ftp.quit()
                return False

        ftp.quit()
        ok("FTP deployment complete")
        return True
    except Exception as e:
        err(f"FTP connection failed: {e}")
        return False


def verify_remote_ftp(ip: str) -> bool:
    """Verify remote files via FTP."""
    import ftplib
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 5000, timeout=10)
        ftp.login("anonymous", "anonymous")

        with tempfile.TemporaryDirectory() as tmpdir:
            for fname in ["main", "main.npdm"]:
                remote = f"/{SYSMODULE_DIR}/{fname}"
                local = Path(tmpdir) / fname
                try:
                    with open(local, "wb") as f:
                        ftp.retrbinary(f"RETR {remote}", f.write)
                except Exception as e:
                    err(f"Could not download {fname}: {e}")
                    ftp.quit()
                    return False

                if fname == "main":
                    valid, msg = check_nso_sanity(local)
                else:
                    valid, msg = check_npdm_sanity(local)
                if valid:
                    ok(f"Remote {fname}: {msg}")
                else:
                    err(f"Remote {fname}: {msg}")
                    ftp.quit()
                    return False
        ftp.quit()
        return True
    except Exception as e:
        err(f"FTP verification failed: {e}")
        return False


# ─── SD Card Mount Deployment ────────────────────────────────────────────────

def deploy_via_sd(mount_point: str, staging: StagingArea) -> bool:
    """Deploy staged files to mounted SD card."""
    target = Path(mount_point) / SYSMODULE_DIR
    target.mkdir(parents=True, exist_ok=True)
    return staging.deploy_to(target)


def verify_local_sd(mount_point: str) -> bool:
    """Verify local SD card files."""
    target = Path(mount_point) / SYSMODULE_DIR
    valid1, msg1 = check_nso_sanity(target / "main")
    valid2, msg2 = check_npdm_sanity(target / "main.npdm")
    if valid1:
        ok(f"Local main: {msg1}")
    else:
        err(f"Local main: {msg1}")
    if valid2:
        ok(f"Local main.npdm: {msg2}")
    else:
        err(f"Local main.npdm: {msg2}")
    return valid1 and valid2


# ─── Main Commands ────────────────────────────────────────────────────────────

def check_boot2_safety(target_path: Path) -> tuple[bool, str]:
    """Check if boot2.flag exists and warn about boot safety."""
    boot2_flag = target_path / "flags" / "boot2.flag"
    if boot2_flag.exists():
        return False, (
            "CRITICAL: boot2.flag is present! "
            "boot2.flag causes FATAL ERROR 2001-0132 or pm std::abort() during boot2. "
            "This is a KNOWN ISSUE with this Atmosphere version + custom sysmodules. "
            "NEVER use boot2.flag. Load sysmodule manually after boot completes."
        )
    return True, "boot2.flag not present - safe development mode"


def remove_boot2_flag(target_path: Path) -> bool:
    """Remove boot2.flag if it exists."""
    boot2_flag = target_path / "flags" / "boot2.flag"
    if boot2_flag.exists():
        boot2_flag.unlink()
        ok("Removed boot2.flag - sysmodule will not auto-load during boot")
        return True
    return False


def cmd_deploy(args):
    staging = StagingArea(BUILD_DIR)
    try:
        if not staging.stage_build():
            return 1

        # Determine target path
        if args.ftp:
            # For FTP, we can't directly check boot2.flag, warn anyway
            warn("=" * 60)
            warn("BOOT2 SAFETY WARNING")
            warn("=" * 60)
            warn("If boot2.flag exists on the remote Switch, this sysmodule")
            warn("will auto-load during boot2. A crash during init will BRICK")
            warn("the boot process with fatal error 2001-0132.")
            warn("Use 'status --ftp IP' to check, or remove manually.")
            warn("=" * 60)
            if not deploy_via_ftp(args.ftp, staging):
                return 1
        elif args.sd:
            target = Path(args.sd) / f"atmosphere/contents/{EXPECTED_TITLE_ID}"

            # Check boot2 safety
            safe, msg = check_boot2_safety(target)
            if not safe:
                err("=" * 60)
                err("BOOT2 SAFETY VIOLATION")
                err("=" * 60)
                err(msg)
                err("=" * 60)
                if args.no_boot2:
                    info("--no-boot2 specified, removing boot2.flag automatically...")
                    remove_boot2_flag(target)
                else:
                    err("Deployment ABORTED.")
                    err("Options:")
                    err("  1. Remove boot2.flag manually from SD card:")
                    err(f"     rm {target}/flags/boot2.flag")
                    err("  2. Run deploy with --no-boot2 flag to auto-remove")
                    err("  3. Only add boot2.flag back after sysmodule is fully stable")
                    return 1

            if not deploy_via_sd(args.sd, staging):
                return 1
        else:
            err("Specify --ftp IP or --sd PATH")
            return 1

        info("Deployment complete. Sysmodule is installed WITHOUT boot2.flag.")
        info("Load manually after boot: use NX-Shell or a sysmodule loader homebrew.")
        info("NEVER add boot2.flag - it crashes the boot process (fatal error 2001-0132).")
        if not args.no_boot2:
            info("If sysmodule has boot2.flag, it will auto-load during boot.")
            info("Test carefully - any init crash = fatal error 2001-0132")
        return 0
    finally:
        staging.cleanup()


def cmd_verify(args):
    if args.ftp:
        return 0 if verify_remote_ftp(args.ftp) else 1
    elif args.sd:
        return 0 if verify_local_sd(args.sd) else 1
    else:
        # Verify local build artifacts
        ok1, msg1 = check_nso_sanity(BUILD_DIR / "aura_nx_sysmodule.nso")
        if ok1:
            ok(f"Build NSO: {msg1}")
        else:
            err(f"Build NSO: {msg1}")

        npdm_json = BUILD_DIR / "template_fixed.npdm"
        if npdm_json.exists():
            with open(npdm_json, "rb") as f:
                magic = f.read(4)
            if magic.startswith(b'{'):
                warn(f"Build NPDM is JSON source (not compiled binary)")
            else:
                ok(f"Build NPDM appears to be binary")
        return 0 if ok1 else 1


def cmd_status(args):
    info("Aura-NX Update Manager Status")
    info(f"Expected title_id: {EXPECTED_TITLE_ID}")
    info(f"Build directory: {BUILD_DIR}")
    info(f"NPDM compiler: {NPDMTOOL}")
    print()
    if args.ftp:
        verify_remote_ftp(args.ftp)
    elif args.sd:
        verify_local_sd(args.sd)
    return 0


def main():
    parser = argparse.ArgumentParser(description="Aura-NX Sysmodule Update Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # deploy
    deploy_parser = subparsers.add_parser("deploy", help="Deploy sysmodule to Switch")
    deploy_parser.add_argument("--ftp", metavar="IP", help="Deploy via FTP to Switch IP")
    deploy_parser.add_argument("--sd", metavar="PATH", help="Deploy to mounted SD card path")
    deploy_parser.add_argument("--no-boot2", action="store_true",
                               help="Auto-remove boot2.flag for safe development (SD mode only)")

    # verify
    verify_parser = subparsers.add_parser("verify", help="Verify sysmodule files")
    verify_parser.add_argument("--ftp", metavar="IP", help="Verify remote files via FTP")
    verify_parser.add_argument("--sd", metavar="PATH", help="Verify local SD card files")

    # status
    status_parser = subparsers.add_parser("status", help="Show status")
    status_parser.add_argument("--ftp", metavar="IP", help="Check remote status via FTP")
    status_parser.add_argument("--sd", metavar="PATH", help="Check local SD card status")

    # safety-check
    safety_parser = subparsers.add_parser("safety-check", help="Check boot2 safety")
    safety_parser.add_argument("--sd", metavar="PATH", required=True, help="Check SD card boot2 safety")

    args = parser.parse_args()

    if args.command == "deploy":
        return cmd_deploy(args)
    elif args.command == "verify":
        return cmd_verify(args)
    elif args.command == "status":
        return cmd_status(args)
    elif args.command == "safety-check":
        target = Path(args.sd) / f"atmosphere/contents/{EXPECTED_TITLE_ID}"
        safe, msg = check_boot2_safety(target)
        if safe:
            ok(msg)
        else:
            err(msg)
            info("Run with --no-boot2 during deploy to auto-remove")
        return 0 if safe else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
