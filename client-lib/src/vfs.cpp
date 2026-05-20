#include <sys/iosupport.h>
#include <sys/fcntl.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/stat.h>
#include "aura_nx.h"

#define MCP_SERVER_PORT 12347
#define RELOAD_PORT 12348
#define DEFAULT_PC_IP "127.0.0.1"

typedef struct {
    int socket;
    off_t offset;
} net_file_t;

static int g_udp_socket = -1;
static void (*g_reload_cb)(const char* path) = NULL;
static char g_pc_ip[64] = "127.0.0.1";

static int net_open(struct _reent *r, void *fileStruct, const char *path, int flags, int mode) {
    (void)flags; (void)mode;
    net_file_t *file = (net_file_t *)fileStruct;
    
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        r->_errno = errno;
        return -1;
    }
    
    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(MCP_SERVER_PORT);
    serv_addr.sin_addr.s_addr = inet_addr(g_pc_ip);
    
    if (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        close(sock);
        r->_errno = errno;
        return -1;
    }
    
    char buffer[1024];
    // Strip "net:/" prefix if present
    const char* real_path = path;
    if (strncmp(path, "net:/", 5) == 0) {
        real_path = path + 5;
    } else if (strncmp(path, "net:", 4) == 0) {
        real_path = path + 4;
    }

    snprintf(buffer, sizeof(buffer), "FETCH %s\n", real_path);
    if (send(sock, buffer, strlen(buffer), 0) < 0) {
        close(sock);
        r->_errno = errno;
        return -1;
    }
    
    file->socket = sock;
    file->offset = 0;
    return 0;
}

static int net_close(struct _reent *r, void *fd) {
    (void)r;
    net_file_t *file = (net_file_t *)fd;
    if (file->socket >= 0) {
        close(file->socket);
        file->socket = -1;
    }
    return 0;
}

static ssize_t net_read(struct _reent *r, void *fd, char *ptr, size_t len) {
    net_file_t *file = (net_file_t *)fd;
    ssize_t ret = recv(file->socket, ptr, len, 0);
    if (ret > 0) {
        file->offset += ret;
    } else if (ret < 0) {
        r->_errno = errno;
    }
    return ret;
}

static ssize_t net_write(struct _reent *r, void *fd, const char *ptr, size_t len) {
    (void)fd; (void)ptr; (void)len;
    r->_errno = EROFS; // Network VFS is read-only for now
    return -1;
}

static off_t net_seek(struct _reent *r, void *fd, off_t pos, int dir) {
    net_file_t *file = (net_file_t *)fd;
    char buffer[1024];
    
    // Send SEEK command to server
    snprintf(buffer, sizeof(buffer), "SEEK %lld %d\n", (long long)pos, dir);
    if (send(file->socket, buffer, strlen(buffer), 0) < 0) {
        r->_errno = errno;
        return -1;
    }
    
    // Receive confirmation. We must discard data currently in the buffer
    // until we find the SEEK_OK response from the server.
    char line[256];
    int line_pos = 0;
    while (true) {
        char c;
        if (recv(file->socket, &c, 1, 0) <= 0) {
            r->_errno = EIO;
            return -1;
        }
        
        line[line_pos++] = c;
        if (c == '\n') {
            line[line_pos] = '\0';
            if (strncmp(line, "SEEK_OK ", 8) == 0) {
                off_t new_pos = atoll(line + 8);
                file->offset = new_pos;
                return new_pos;
            }
            line_pos = 0;
        }
        if (line_pos >= (int)sizeof(line) - 1) {
            line_pos = 0;
        }
    }
}

static int net_fstat(struct _reent *r, void *fd, struct stat *st) {
    (void)fd;
    memset(st, 0, sizeof(struct stat));
    st->st_mode = S_IFREG | S_IRUSR | S_IRGRP | S_IROTH;
    st->st_nlink = 1;
    return 0;
}

static int net_stat(struct _reent *r, const char *file, struct stat *st) {
    (void)file;
    memset(st, 0, sizeof(struct stat));
    st->st_mode = S_IFREG | S_IRUSR | S_IRGRP | S_IROTH;
    st->st_nlink = 1;
    return 0;
}

static const devoptab_t net_devoptab = {
    "net",
    sizeof(net_file_t),
    net_open,
    net_close,
    net_write,
    net_read,
    net_seek,
    net_fstat,
    net_stat,
    NULL, // link
    NULL, // unlink
    NULL, // chdir
    NULL, // rename
    NULL, // mkdir
    0,    // dirStateSize
    NULL, // diropen_r
    NULL, // dirclose_r
    NULL, // dirnext_r
    NULL, // statvfs_r
    NULL, // ftruncate_r
    NULL, // fsync_r
    NULL, // deviceData
    NULL, // chmod_r
    NULL, // fchmod_r
    NULL, // utimes_r
};

Result auraNxInit(const char* pc_ip) {
    if (pc_ip) {
        strncpy(g_pc_ip, pc_ip, sizeof(g_pc_ip) - 1);
    }
    // Register the device
    int dev = AddDevice(&net_devoptab);
    if (dev < 0) return -1;
    
    // Setup UDP socket for reload signals
    g_udp_socket = socket(AF_INET, SOCK_DGRAM, 0);
    if (g_udp_socket >= 0) {
        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_port = htons(RELOAD_PORT);
        addr.sin_addr.s_addr = INADDR_ANY;
        
        if (bind(g_udp_socket, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
            close(g_udp_socket);
            g_udp_socket = -1;
        } else {
            // Set non-blocking
            int flags = fcntl(g_udp_socket, F_GETFL, 0);
            fcntl(g_udp_socket, F_SETFL, flags | O_NONBLOCK);
        }
    }
    
    return 0;
}

void auraNxSetReloadCallback(void (*cb)(const char* path)) {
    g_reload_cb = cb;
}

void auraNxUpdate() {
    if (g_udp_socket < 0) return;
    
    char buffer[1024];
    struct sockaddr_in src_addr;
    socklen_t addr_len = sizeof(src_addr);
    ssize_t ret = recvfrom(g_udp_socket, buffer, sizeof(buffer) - 1, 0, (struct sockaddr *)&src_addr, &addr_len);
    
    if (ret > 0) {
        buffer[ret] = '\0';
        const char* path = NULL;
        
        if (strncmp(buffer, "RELOAD_ASSET ", 13) == 0) {
            path = buffer + 13;
        } else if (strncmp(buffer, "RELOAD ", 7) == 0) {
            path = buffer + 7;
        } else if (strcmp(buffer, "RELOAD") == 0) {
            path = NULL;
        } else {
            // Unrecognized signal, but maybe it's just the path
            path = buffer;
        }
        
        if (g_reload_cb) {
            g_reload_cb(path);
        }
    }
}
