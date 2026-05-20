#include <switch.h>
#include <cstdio>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>

extern "C" {
    // Sysmodules don't use standard heap by default, we need to provide one
    u32 __nx_applet_type = AppletType_None;
    u32 __nx_fs_num_sessions = 1;

    void __libnx_initheap(void) {
        static char g_heap[0x100000]; // 1MB heap for networking and logic
        extern char* fake_heap_start;
        extern char* fake_heap_end;
        fake_heap_start = g_heap;
        fake_heap_end   = g_heap + sizeof(g_heap);
    }
}

// IOCTL structure for GPU load (NVGPU_GPU_IOCTL_PMU_GET_GPU_LOAD)
struct nv_gpu_pmu_get_gpu_load_args {
    u32 gpu_load;
    u32 reserved;
};

// Retrieve GPU load from nvdrv using the specified IOCTL
u32 getGpuLoad(u32 fd) {
    if (fd == 0) return 0;
    nv_gpu_pmu_get_gpu_load_args args = {0, 0};
    // NVGPU_GPU_IOCTL_PMU_GET_GPU_LOAD: 0x40084716
    Result rc = nvIoctl(fd, 0x40084716, &args);
    if (R_FAILED(rc)) return 0;
    return args.gpu_load;
}

// Handle JSON-RPC requests from the TCP server
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
        
        // Get CPU clock rate using clkrst service
        if (R_SUCCEEDED(clkrstOpenSession(&session, PcvModule_CpuBus, 3))) {
            clkrstGetClockRate(&session, &cpu_hz);
            clkrstCloseSession(&session);
        }
        
        // Get GPU clock rate using clkrst service
        if (R_SUCCEEDED(clkrstOpenSession(&session, PcvModule_Gpu, 3))) {
            clkrstGetClockRate(&session, &gpu_hz);
            clkrstCloseSession(&session);
        }

        char response[256];
        snprintf(response, sizeof(response), "{\"jsonrpc\":\"2.0\",\"result\":{\"cpu\":%u,\"gpu\":%u},\"id\":1}\n", cpu_hz, gpu_hz);
        send(client_fd, response, strlen(response), 0);
    }
}

int main(int argc, char* argv[]) {
    // Initialize required services
    smInitialize();
    nvInitialize();
    clkrstInitialize();
    socketInitializeDefault();

    // Open GPU control for IOCTLs
    u32 nv_fd = 0;
    nvOpen("/dev/nvhost-ctrl-gpu", &nv_fd);

    // Set up the TCP server on port 12346
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        // Fallback loop if socket creation fails
        while (true) svcSleepThread(1000000000ULL);
    }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in address;
    memset(&address, 0, sizeof(address));
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(12346);

    // Bind and listen for incoming connections
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        while (true) svcSleepThread(1000000000ULL);
    }
    
    if (listen(server_fd, 5) < 0) {
        while (true) svcSleepThread(1000000000ULL);
    }

    // Set non-blocking for the server socket to maintain responsiveness
    int flags = fcntl(server_fd, F_GETFL, 0);
    fcntl(server_fd, F_SETFL, flags | O_NONBLOCK);

    // Main sysmodule loop
    while (true) {
        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
        
        if (client_fd >= 0) {
            handleRequest(client_fd, nv_fd);
            close(client_fd);
        }

        // Sleep for 10ms to keep the loop responsive while respecting system limits
        svcSleepThread(10000000ULL);
    }

    // Cleanup (not typically reached)
    if (nv_fd) nvClose(nv_fd);
    socketExit();
    clkrstExit();
    nvExit();
    smExit();

    return 0;
}
