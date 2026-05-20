#ifndef SAVE_MANAGER_H
#define SAVE_MANAGER_H

/**
 * @brief Handles the backup of save data.
 * 
 * This function interacts with the filesystem to zip or copy save data.
 * 
 * @param name The name of the save to backup.
 * @return true if the backup was successful, false otherwise.
 */
bool handleBackupSave(const char* name);

/**
 * @brief Handles the restoration of save data.
 * 
 * This function interacts with the filesystem to restore save data from a backup.
 * 
 * @param name The name of the save to restore.
 * @return true if the restoration was successful, false otherwise.
 */
bool handleRestoreSave(const char* name);

#endif // SAVE_MANAGER_H
