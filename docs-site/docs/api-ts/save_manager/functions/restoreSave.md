[**Aura-NX MCP API**](../../README.md)

***

[Aura-NX MCP API](../../README.md) / [save\_manager](../README.md) / restoreSave

> **restoreSave**(`ip`, `name`): `Promise`\<`string`\>

Defined in: [save\_manager.ts:60](https://github.com/jxoesneon/aura-nx/blob/36bf3519f9e12b159d44ce0d6b0ba4ef6ed7b787/mcp-server/src/save_manager.ts#L60)

Sends a JSON-RPC restore_save command to the sysmodule.

## Parameters

### ip

`string`

The IP address of the Switch device.

### name

`string`

The name of the save to restore.

## Returns

`Promise`\<`string`\>

A promise that resolves with the status message from the device.
