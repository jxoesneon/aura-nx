#include <switch.h>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

static FILE* g_log = nullptr;
static bool g_socket_ready = false;
static int g_server_fd = -1;

static void logmsg(const char* msg) {
    if (g_log) {
        fprintf(g_log, "%s\n", msg);
        fflush(g_log);
    }
}

static void logres(const char* label, Result rc) {
    if (g_log) {
        fprintf(g_log, "AURA: %s = 0x%08X\n", label, rc);
        fflush(g_log);
    }
}

extern "C" {
    u32 __nx_applet_type = AppletType_None;
    u32 __nx_fs_num_sessions = 1;

    void __appInit(void) {
        Result rc;

        rc = smInitialize();
        if (R_FAILED(rc)) diagAbortWithResult(MAKERESULT(Module_Libnx, LibnxError_InitFail_SM));

        rc = fsInitialize();
        if (R_FAILED(rc)) {
            smExit();
            diagAbortWithResult(MAKERESULT(Module_Libnx, LibnxError_InitFail_FS));
        }

        fsdevMountSdmc();
        g_log = fopen("/sdmc:/aura_debug.log", "w");
        logmsg("=== AURA-NX Stable + Lazy Socket ===");

        rc = setsysInitialize();
        if (R_SUCCEEDED(rc)) {
            SetSysFirmwareVersion fw;
            rc = setsysGetFirmwareVersion(&fw);
            if (R_SUCCEEDED(rc)) {
                hosversionSet(MAKEHOSVERSION(fw.major, fw.minor, fw.micro));
                char buf[128];
                snprintf(buf, sizeof(buf), "FW %d.%d.%d", fw.major, fw.minor, fw.micro);
                logmsg(buf);
            }
            setsysExit();
        }

        logmsg("spsmInitialize starting...");
        rc = spsmInitialize();
        logres("spsmInitialize", rc);
        if (R_SUCCEEDED(rc)) {
            logmsg("spsmInitialize SUCCESS");
        }

        // NOTE: socketInitialize deferred to main() loop
        logmsg("__appInit complete - socket deferred");
        if (g_log) fflush(g_log);
    }

    void __appExit(void) {
        if (g_log) {
            logmsg("__appExit called");
            fclose(g_log);
            g_log = nullptr;
        }
        if (g_socket_ready) {
            if (g_server_fd >= 0) close(g_server_fd);
            socketExit();
        }
        spsmExit();
        fsdevUnmountAll();
        fsExit();
        smExit();
    }
}

bool tryInitSocket() {
    if (g_socket_ready) return true;

    SocketInitConfig cfg = *socketGetDefaultInitConfig();
    cfg.tcp_tx_buf_size = 0x4000;
    cfg.tcp_rx_buf_size = 0x4000;
    cfg.tcp_tx_buf_max_size = 0x8000;
    cfg.tcp_rx_buf_max_size = 0x8000;
    cfg.udp_tx_buf_size = 0x1200;
    cfg.udp_rx_buf_size = 0x5280;
    cfg.sb_efficiency = 1;
    cfg.num_bsd_sessions = 1;
    cfg.bsd_service_type = BsdServiceType_Auto;

    Result rc = socketInitialize(&cfg);
    if (R_FAILED(rc)) return false;

    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        socketExit();
        return false;
    }

    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(12346);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(fd);
        socketExit();
        return false;
    }

    if (listen(fd, 5) < 0) {
        close(fd);
        socketExit();
        return false;
    }

    g_server_fd = fd;
    g_socket_ready = true;
    return true;
}

bool jsonMethodIs(const char* json, const char* method) {
    const char* key = "\"method\"";
    const char* start = strstr(json, key);
    if (!start) return false;
    start += strlen(key);
    while (*start == ' ' || *start == ':' || *start == '"') start++;
    size_t method_len = strlen(method);
    return strncmp(start, method, method_len) == 0 &&
           (start[method_len] == '"' || start[method_len] == ' ' || start[method_len] == ',');
}

void handleRequest(int client_fd) {
    char buffer[1024];
    memset(buffer, 0, sizeof(buffer));
    ssize_t bytes_received = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
    if (bytes_received <= 0) return;

    if (jsonMethodIs(buffer, "reboot")) {
        if (g_log) {
            logmsg("Reboot requested via MCP");
            fclose(g_log);
            g_log = nullptr;
        }
        spsmShutdown(true);
        const char* response = "{\"jsonrpc\":\"2.0\",\"result\":\"Rebooting...\",\"id\":1}\n";
        send(client_fd, response, strlen(response), 0);
    } else {
        const char* response = "{\"jsonrpc\":\"2.0\",\"result\":\"aura-nx-ok\",\"id\":1}\n";
        send(client_fd, response, strlen(response), 0);
    }
}

int main(int argc, char* argv[]) {
    if (g_log) {
        logmsg("main() entered - waiting for socket...");
        fflush(g_log);
    }

    int attempts = 0;
    while (!tryInitSocket()) {
        attempts++;
        if (attempts % 10 == 0 && g_log) {
            fprintf(g_log, "Socket retry #%d...\n", attempts);
            fflush(g_log);
        }
        svcSleepThread(1000000000ULL);  // 1 second
    }

    if (g_log) {
        fprintf(g_log, "Socket ready after %d attempts!\n", attempts);
        fflush(g_log);
    }

    while (true) {
        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        int client_fd = accept(g_server_fd, (struct sockaddr *)&client_addr, &addrlen);
        if (client_fd >= 0) {
            handleRequest(client_fd);
            close(client_fd);
        }
        svcSleepThread(10000000ULL);
    }

    return 0;
}
