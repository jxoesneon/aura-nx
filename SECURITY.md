# Security Policy for Aura-NX

## mTLS Security Model
Aura-NX implements a Mutual TLS (mTLS) security model to ensure secure communication between the Switch sysmodule and any authorized companion application.

1. **Mutual Authentication:** Both the sysmodule and the companion must present valid certificates signed by a trusted Certificate Authority (CA).
2. **Certificate Storage:**
   - Root CA and sysmodule certificates are stored on the SD card at `sdmc:/aura-nx/certs/`.
   - Ensure these files are protected and not shared publicly.
3. **Encryption:** All traffic is encrypted using mbedTLS with strong cipher suites.
4. **Policy Enforcement:** The sysmodule will reject any connection attempt that does not provide a valid client certificate signed by the recognized CA.

## Responsible Disclosure
We take the security of Aura-NX seriously. If you discover a vulnerability, please report it responsibly:

1. **Private Reporting:** Do not open a public issue. Email security reports to [security@aura-nx.org] (placeholder).
2. **Details:** Include a detailed description of the vulnerability, steps to reproduce, and a potential fix if available.
3. **Timeline:** We aim to acknowledge reports within 48 hours and provide a fix within 30 days.
4. **Bounty:** We do not currently have a formal bug bounty program, but we greatly appreciate and acknowledge contributors who help secure the project.

## Security Practices
- Keep your Switch firmware and Aura-NX sysmodule updated.
- Use unique certificates for different devices if possible.
- Regularly audit the `certs/` directory for unauthorized additions.
