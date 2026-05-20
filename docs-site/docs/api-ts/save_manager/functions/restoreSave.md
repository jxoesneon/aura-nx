[**mcp-server**](../../README.md)

***

[mcp-server](../../README.md) / [save\_manager](../README.md) / restoreSave

# Function: restoreSave()

> **restoreSave**(`ip`, `name`): `Promise`\<`string`\>

Defined in: [save\_manager.ts:60](https://github.com/jxoesneon/aura-nx/blob/9e274c37fbdc51fd698275d695ab06a38b27abd0/mcp-server/src/save_manager.ts#L60)

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
