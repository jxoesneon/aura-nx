[**mcp-server**](../../README.md)

***

[mcp-server](../../README.md) / [discovery](../README.md) / startDiscoveryListener

> **startDiscoveryListener**(`onDiscover`): `void`

Defined in: [discovery.ts:13](https://github.com/jxoesneon/aura-nx/blob/2c9647e83da67127679e3eeb001b86cfacad009e/mcp-server/src/discovery.ts#L13)

Starts a UDP listener that waits for 'AURA_ANNOUNCE' packets.
Maintains a set of active IPs to prevent duplicate notifications.

## Parameters

### onDiscover

(`ip`) => `void`

## Returns

`void`
