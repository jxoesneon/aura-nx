[**Aura-NX MCP API**](../../README.md)

***

[Aura-NX MCP API](../../README.md) / [discovery](../README.md) / startDiscoveryListener

> **startDiscoveryListener**(`onDiscover`): `void`

Defined in: [discovery.ts:13](https://github.com/jxoesneon/aura-nx/blob/36bf3519f9e12b159d44ce0d6b0ba4ef6ed7b787/mcp-server/src/discovery.ts#L13)

Starts a UDP listener that waits for 'AURA_ANNOUNCE' packets.
Maintains a set of active IPs to prevent duplicate notifications.

## Parameters

### onDiscover

(`ip`) => `void`

## Returns

`void`
