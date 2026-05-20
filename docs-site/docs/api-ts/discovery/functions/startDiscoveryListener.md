[**mcp-server**](../../README.md)

***

[mcp-server](../../README.md) / [discovery](../README.md) / startDiscoveryListener

# Function: startDiscoveryListener()

> **startDiscoveryListener**(`onDiscover`): `void`

Defined in: [discovery.ts:13](https://github.com/jxoesneon/aura-nx/blob/9e274c37fbdc51fd698275d695ab06a38b27abd0/mcp-server/src/discovery.ts#L13)

Starts a UDP listener that waits for 'AURA_ANNOUNCE' packets.
Maintains a set of active IPs to prevent duplicate notifications.

## Parameters

### onDiscover

(`ip`) => `void`

## Returns

`void`
