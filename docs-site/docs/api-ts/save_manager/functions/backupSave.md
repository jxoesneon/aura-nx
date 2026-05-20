[**Aura-NX MCP API**](../../README.md)

***

[Aura-NX MCP API](../../README.md) / [save\_manager](../README.md) / backupSave

> **backupSave**(`ip`, `name`): `Promise`\<`string`\>

Defined in: [save\_manager.ts:12](https://github.com/jxoesneon/aura-nx/blob/36bf3519f9e12b159d44ce0d6b0ba4ef6ed7b787/mcp-server/src/save_manager.ts#L12)

Sends a JSON-RPC backup_save command to the sysmodule.

## Parameters

### ip

`string`

The IP address of the Switch device.

### name

`string`

The name of the save to backup.

## Returns

`Promise`\<`string`\>

A promise that resolves with the status message from the device.
