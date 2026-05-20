[**mcp-server**](../../README.md)

***

[mcp-server](../../README.md) / [capture](../README.md) / handleCaptureScreen

# Function: handleCaptureScreen()

> **handleCaptureScreen**(`ip`): `Promise`\<`string`\>

Defined in: [capture.ts:9](https://github.com/jxoesneon/aura-nx/blob/9e274c37fbdc51fd698275d695ab06a38b27abd0/mcp-server/src/capture.ts#L9)

Requests a screen capture frame from the Aura-NX sysmodule.

## Parameters

### ip

`string`

The IP address of the Nintendo Switch console.

## Returns

`Promise`\<`string`\>

A base64 encoded string representing the captured frame (JPEG).
