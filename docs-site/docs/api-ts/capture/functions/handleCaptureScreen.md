[**Aura-NX MCP API**](../../README.md)

***

[Aura-NX MCP API](../../README.md) / [capture](../README.md) / handleCaptureScreen

> **handleCaptureScreen**(`ip`): `Promise`\<`string`\>

Defined in: [capture.ts:9](https://github.com/jxoesneon/aura-nx/blob/36bf3519f9e12b159d44ce0d6b0ba4ef6ed7b787/mcp-server/src/capture.ts#L9)

Requests a screen capture frame from the Aura-NX sysmodule.

## Parameters

### ip

`string`

The IP address of the Nintendo Switch console.

## Returns

`Promise`\<`string`\>

A base64 encoded string representing the captured frame (JPEG).
