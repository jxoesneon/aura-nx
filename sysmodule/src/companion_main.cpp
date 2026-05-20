#include <switch.h>
#include <cstdio>

int main(int argc, char* argv[]) {
    // Initialize standard HID
    padConfigureInput(1, HidNpadStyleSet_NpadStandard);
    PadState pad;
    padInitializeDefault(&pad);

    consoleInit(NULL);
    printf("Aura NX Companion App\n");
    printf("Status: Running\n");
    printf("Press PLUS to exit.\n");

    while (appletMainLoop()) {
        padUpdate(&pad);
        u64 kDown = padGetButtonsDown(&pad);

        if (kDown & HidNpadButton_Plus) break;
        
        consoleUpdate(NULL);
    }

    consoleExit(NULL);
    return 0;
}