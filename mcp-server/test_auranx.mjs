import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["ts-node", "/Users/mey/aura-nx/mcp-server/src/index.ts"],
  env: { ...process.env, WS_PORT: "0" }
});

const client = new Client({ name: "test", version: "1.0" }, { capabilities: {} });
await client.connect(transport);

const tools = await client.listTools();
console.log(JSON.stringify(tools.tools.map(t => t.name), null, 2));

await client.close();
