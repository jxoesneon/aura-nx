#include "crash_monitor.h"
#include <switch.h>
#include <cstdio>
#include <cstring>
#include <dirent.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>

#define PC_IP "192.168.1.100" // Placeholder PC IP
#define PC_PORT 12350

void sendFileToPC(const char* filePath) {
    FILE* f = fopen(filePath, "rb");
    if (!f) return;

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        fclose(f);
        return;
    }

    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(PC_PORT);
    inet_pton(AF_INET, PC_IP, &server_addr.sin_addr);

    // Set a timeout for the connection
    struct timeval tv;
    tv.tv_sec = 2;
    tv.tv_usec = 0;
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    if (connect(sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) >= 0) {
        char buffer[4096];
        size_t bytesRead;
        while ((bytesRead = fread(buffer, 1, sizeof(buffer), f)) > 0) {
            send(sock, buffer, bytesRead, 0);
        }
    }

    close(sock);
    fclose(f);

    // Optionally rename or delete the file after sending to avoid re-sending
    char newPath[512];
    snprintf(newPath, sizeof(newPath), "%s.sent", filePath);
    rename(filePath, newPath);
}

void pollCrashReports() {
    const char* crashDir = "sdmc:/atmosphere/crash_reports/";
    DIR* dir = opendir(crashDir);
    if (!dir) return;

    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        // Look for .bin files
        if (strstr(entry->d_name, ".bin") && !strstr(entry->d_name, ".sent")) {
            char fullPath[512];
            snprintf(fullPath, sizeof(fullPath), "%s%s", crashDir, entry->d_name);
            sendFileToPC(fullPath);
        }
    }

    closedir(dir);
}
