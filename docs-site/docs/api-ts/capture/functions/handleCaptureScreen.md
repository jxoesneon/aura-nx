[**mcp-server**](../../README.md)

***

[mcp-server](../../README.md) / [capture](../README.md) / handleCaptureScreen

> **handleCaptureScreen**(`ip`): `Promise`\<`string`\>

Defined in: [capture.ts:9](https://github.com/jxoesneon/aura-nx/blob/2c9647e83da67127679e3eeb001b86cfacad009e/mcp-server/src/capture.ts#L9)

Requests a screen capture frame from the Aura-NX sysmodule.

## Parameters

### ip

`string`

The IP address of the Nintendo Switch console.

## Returns

`Promise`\<`string`\>

A base64 encoded string representing the captured frame (JPEG).
