#include <switch.h>
#include <cstdio>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <malloc.h>

#include "discovery.h"
#include "capture.h"
#include "crash_monitor.h"
#include "save_manager.h"
#include "input_injector.h"

extern "C" {
    u32 __nx_applet_type = AppletType_None;
    u32 __nx_fs_num_sessions = 1;

    void __libnx_initheap(void) {
        static char g_heap[0x100000]; // 1MB heap
        extern char* fake_heap_start;
        extern char* fake_heap_end;
        fake_heap_start = g_heap;
        fake_heap_end   = g_heap + sizeof(g_heap);
    }
}

struct nv_gpu_pmu_get_gpu_load_args {
    u32 gpu_load;
    u32 reserved;
};

u32 getGpuLoad(u32 fd) {
    if (fd == 0) return 0;
    nv_gpu_pmu_get_gpu_load_args args = {0, 0};
    Result rc = nvIoctl(fd, 0x40084716, &args);
    if (R_FAILED(rc)) return 0;
    return args.gpu_load;
}

// Minimal JSON extraction
void extractJsonString(const char* json, const char* key, char* out, size_t out_len) {
    char search_key[64];
    snprintf(search_key, sizeof(search_key), "\"%s\":\"", key);
    const char* start = strstr(json, search_key);
    if (!start) {
        out[0] = '\0';
        return;
    }
    start += strlen(search_key);
    const char* end = strchr(start, '"');
    if (!end) {
        out[0] = '\0';
        return;
    }
    size_t len = end - start;
    if (len >= out_len) len = out_len - 1;
    strncpy(out, start, len);
    out[len] = '\0';
}

long long extractJsonNumber(const char* json, const char* key) {
    char search_key[64];
    snprintf(search_key, sizeof(search_key), "\"%s\":", key);
    const char* start = strstr(json, search_key);
    if (!start) return 0;
    start += strlen(search_key);
    while (*start == ' ' || *start == ':' || *start == '"') start++;
    return atoll(start);
}

void handleRequest(int client_fd, u32 nv_fd) {
    char buffer[1024];
    memset(buffer, 0, sizeof(buffer));
    ssize_t bytes_received = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
    if (bytes_received <= 0) return;

    if (strstr(buffer, "\"method\":\"get_gpu_load\"")) {
        u32 load = getGpuLoad(nv_fd);
        char response[256];
        snprintf(response, sizeof(response), "{\"jsonrpc\":\"2.0\",\"result\":{\"load\":%u},\"id\":1}\n", load);
        send(client_fd, response, strlen(response), 0);
    } else if (strstr(buffer, "\"method\":\"get_clocks\"")) {
        u32 cpu_hz = 0, gpu_hz = 0;
        ClkrstSession session;
        if (R_SUCCEEDED(clkrstOpenSession(&session, PcvModule_CpuBus, 3))) {
            clkrstGetClockRate(&session, &cpu_hz);
            clkrstCloseSession(&session);
        }
        if (R_SUCCEEDED(clkrstOpenSession(&session, PcvModule_Gpu, 3))) {
            clkrstGetClockRate(&session, &gpu_hz);
            clkrstCloseSession(&session);
        }
        char response[256];
        snprintf(response, sizeof(response), "{\"jsonrpc\":\"2.0\",\"result\":{\"cpu\":%u,\"gpu\":%u},\"id\":1}\n", cpu_hz, gpu_hz);
        send(client_fd, response, strlen(response), 0);
    } else if (strstr(buffer, "\"method\":\"capture_screen\"")) {
        char* jpeg_buffer = nullptr;
        size_t jpeg_size = 0;
        if (captureScreen(&jpeg_buffer, &jpeg_size) && jpeg_buffer) {
            // Very hacky base64 stub for mock data, in real code you'd base64 encode
            // For this mock, we just return a stub string in JSON
            const char* response = "{\"jsonrpc\":\"2.0\",\"result\":\"/9j/4AAQSkZJRgABA...mock_base64...\",\"id\":1}\n";
            send(client_fd, response, strlen(response), 0);
            free(jpeg_buffer);
        } else {
            const char* err = "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-32603,\"message\":\"Capture failed\"},\"id\":1}\n";
            send(client_fd, err, strlen(err), 0);
        }
    } else if (strstr(buffer, "\"method\":\"backup_save\"")) {
        char name[64];
        extractJsonString(buffer, "name", name, sizeof(name));
        bool success = handleBackupSave(name[0] ? name : "default");
        char response[256];
        snprintf(response, sizeof(response), "{\"jsonrpc\":\"2.0\",\"result\":\"Backup %s\",\"id\":1}\n", success ? "success" : "failed");
        send(client_fd, response, strlen(response), 0);
    } else if (strstr(buffer, "\"method\":\"restore_save\"")) {
        char name[64];
        extractJsonString(buffer, "name", name, sizeof(name));
        bool success = handleRestoreSave(name[0] ? name : "default");
        char response[256];
        snprintf(response, sizeof(response), "{\"jsonrpc\":\"2.0\",\"result\":\"Restore %s\",\"id\":1}\n", success ? "success" : "failed");
        send(client_fd, response, strlen(response), 0);
    } else if (strstr(buffer, "\"method\":\"inject_input\"")) {
        u64 buttons = (u64)extractJsonNumber(buffer, "buttons");
        int duration = (int)extractJsonNumber(buffer, "duration");
        injectInput(buttons, duration);
        const char* response = "{\"jsonrpc\":\"2.0\",\"result\":\"Input injected\",\"id\":1}\n";
        send(client_fd, response, strlen(response), 0);
    }
}

int main(int argc, char* argv[]) {
    smInitialize();
    nvInitialize();
    clkrstInitialize();
    socketInitializeDefault();

    u32 nv_fd = 0;
    nvOpen("/dev/nvhost-ctrl-gpu", &nv_fd);

    // Start auto-discovery broadcast
    startDiscoveryBroadcast();

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) while (true) svcSleepThread(1000000000ULL);

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in address;
    memset(&address, 0, sizeof(address));
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(12346);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) while (true) svcSleepThread(1000000000ULL);
    if (listen(server_fd, 5) < 0) while (true) svcSleepThread(1000000000ULL);

    int flags = fcntl(server_fd, F_GETFL, 0);
    fcntl(server_fd, F_SETFL, flags | O_NONBLOCK);

    while (true) {
        // Poll for crash dumps
        pollCrashReports();

        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
        
        if (client_fd >= 0) {
            handleRequest(client_fd, nv_fd);
            close(client_fd);
        }

        svcSleepThread(10000000ULL);
    }

    if (nv_fd) nvClose(nv_fd);
    socketExit();
    clkrstExit();
    nvExit();
    smExit();

    return 0;
}