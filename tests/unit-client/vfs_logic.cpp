#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <sys/types.h>
#include <stdbool.h>

// Mock structures and types to avoid libnx dependency
typedef int Result;
struct _reent { int _errno; };

// Global state for mocks
static char last_sent_data[1024];
static int last_sent_len = 0;
static char last_reloaded_path[1024];
static bool callback_called = false;

// Mock functions
int mock_socket(int domain, int type, int protocol) { return 42; }
int mock_connect(int sockfd, const void *addr, uint32_t addrlen) { return 0; }
ssize_t mock_send(int sockfd, const void *buf, size_t len, int flags) {
    if (len >= sizeof(last_sent_data)) len = sizeof(last_sent_data) - 1;
    memcpy(last_sent_data, buf, len);
    last_sent_data[len] = '\0';
    last_sent_len = len;
    return len;
}
int mock_close(int fd) { return 0; }

// Redirect standard socket calls to our mocks
#define socket mock_socket
#define connect mock_connect
#define send mock_send
#define close mock_close

// Logic extracted and adapted from aura-nx/client-lib/src/vfs.cpp
// We adapt it slightly to be testable without the full devoptab environment

static int net_open_logic(const char *path) {
    struct _reent r;
    char buffer[1024];
    
    int sock = socket(0, 0, 0);
    if (sock < 0) return -1;
    
    if (connect(sock, NULL, 0) < 0) {
        close(sock);
        return -1;
    }
    
    const char* real_path = path;
    if (strncmp(path, "net:/", 5) == 0) {
        real_path = path + 5;
    } else if (strncmp(path, "net:", 4) == 0) {
        real_path = path + 4;
    }

    snprintf(buffer, sizeof(buffer), "FETCH %s\n", real_path);
    if (send(sock, buffer, strlen(buffer), 0) < 0) {
        close(sock);
        return -1;
    }
    
    close(sock);
    return 0;
}

static void reload_cb(const char* path) {
    callback_called = true;
    if (path) {
        strncpy(last_reloaded_path, path, sizeof(last_reloaded_path)-1);
        last_reloaded_path[sizeof(last_reloaded_path)-1] = '\0';
    } else {
        last_reloaded_path[0] = '\0';
    }
}

// Adapted from auraNxUpdate in vfs.cpp
static void auraNxUpdate_logic(const char* mock_recv_data) {
    char buffer[1024];
    strncpy(buffer, mock_recv_data, sizeof(buffer)-1);
    buffer[sizeof(buffer)-1] = '\0';
    ssize_t ret = strlen(buffer);
    
    if (ret > 0) {
        const char* path = NULL;
        
        if (strncmp(buffer, "RELOAD_ASSET ", 13) == 0) {
            path = buffer + 13;
        } else if (strncmp(buffer, "RELOAD ", 7) == 0) {
            path = buffer + 7;
        } else if (strcmp(buffer, "RELOAD") == 0) {
            path = NULL;
        } else {
            path = buffer;
        }
        
        reload_cb(path);
    }
}

int main() {
    printf("--- Aura-NX Client VFS Logic Unit Tests ---\n");

    // Test 1: net_open FETCH formatting
    {
        printf("Test 1: net_open 'FETCH' formatting... ");
        
        memset(last_sent_data, 0, sizeof(last_sent_data));
        net_open_logic("net:/test/asset.png");
        assert(strcmp(last_sent_data, "FETCH test/asset.png\n") == 0);
        
        memset(last_sent_data, 0, sizeof(last_sent_data));
        net_open_logic("net:config.json");
        assert(strcmp(last_sent_data, "FETCH config.json\n") == 0);
        
        memset(last_sent_data, 0, sizeof(last_sent_data));
        net_open_logic("/absolute/path/file.bin");
        assert(strcmp(last_sent_data, "FETCH /absolute/path/file.bin\n") == 0);
        
        printf("PASSED\n");
    }

    // Test 2: auraNxUpdate UDP packet parsing
    {
        printf("Test 2: auraNxUpdate UDP parsing... ");
        
        // Case A: RELOAD_ASSET
        callback_called = false;
        auraNxUpdate_logic("RELOAD_ASSET models/player.fbx");
        assert(callback_called);
        assert(strcmp(last_reloaded_path, "models/player.fbx") == 0);
        
        // Case B: RELOAD with path
        callback_called = false;
        auraNxUpdate_logic("RELOAD scripts/main.lua");
        assert(callback_called);
        assert(strcmp(last_reloaded_path, "scripts/main.lua") == 0);
        
        // Case C: RELOAD (global)
        callback_called = false;
        auraNxUpdate_logic("RELOAD");
        assert(callback_called);
        assert(last_reloaded_path[0] == '\0');
        
        // Case D: Raw path
        callback_called = false;
        auraNxUpdate_logic("ui/menu.xml");
        assert(callback_called);
        assert(strcmp(last_reloaded_path, "ui/menu.xml") == 0);
        
        printf("PASSED\n");
    }

    printf("\nSuccess: All client VFS logic tests passed!\n");
    return 0;
}
