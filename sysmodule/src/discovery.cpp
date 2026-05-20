#include "discovery.h"
#include <switch.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstring>
#include <thread>
#include <atomic>

static std::atomic<bool> g_discoveryRunning(false);
static int g_udpSocket = -1;

/**
 * Background loop that sends the discovery packet periodically.
 */
static void discoveryLoop() {
    struct sockaddr_in broadcast_addr;
    memset(&broadcast_addr, 0, sizeof(broadcast_addr));
    broadcast_addr.sin_family = AF_INET;
    broadcast_addr.sin_addr.s_addr = inet_addr("255.255.255.255");
    broadcast_addr.sin_port = htons(12349);

    const char* message = "AURA_ANNOUNCE";

    while (g_discoveryRunning) {
        if (g_udpSocket >= 0) {
            // Send the announcement packet
            sendto(g_udpSocket, message, strlen(message), 0, (struct sockaddr*)&broadcast_addr, sizeof(broadcast_addr));
        }
        // Sleep for 5 seconds (5,000,000,000 nanoseconds)
        svcSleepThread(5000000000ULL);
    }
}

/**
 * Initializes a non-blocking UDP socket and starts the broadcast thread.
 */
void startDiscoveryBroadcast() {
    if (g_discoveryRunning) return;

    // Create UDP socket
    g_udpSocket = socket(AF_INET, SOCK_DGRAM, 0);
    if (g_udpSocket < 0) return;

    // Enable broadcast on the socket
    int broadcast_enable = 1;
    if (setsockopt(g_udpSocket, SOL_SOCKET, SO_BROADCAST, &broadcast_enable, sizeof(broadcast_enable)) < 0) {
        close(g_udpSocket);
        g_udpSocket = -1;
        return;
    }

    // Set the socket to non-blocking mode as requested
    int flags = fcntl(g_udpSocket, F_GETFL, 0);
    if (flags != -1) {
        fcntl(g_udpSocket, F_SETFL, flags | O_NONBLOCK);
    }

    // Start the periodic broadcast in a detached thread
    g_discoveryRunning = true;
    std::thread(discoveryLoop).detach();
}
