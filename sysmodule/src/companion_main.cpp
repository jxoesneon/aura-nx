#include <switch.h>
#include <cstdio>

int main(int argc, char* argv[]) {
    consoleInit(NULL);
    printf("Aura NX Companion App\n");
    printf("Status: Running\n");
    printf("Press PLUS to exit.\n");

    while (appletMainLoop()) {
        hidScanInput();
        u64 kDown = hidKeysDown(CONTROLLER_P1_AUTO);
        if (kDown & KEY_PLUS) break;
        consoleUpdate(NULL);
    }

    consoleExit(NULL);
    return 0;
}
