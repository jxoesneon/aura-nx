#pragma once

/**
 * Polls for new crash reports in sdmc:/atmosphere/crash_reports/
 * and uploads them to the PC telemetry server.
 */
void pollCrashReports();
