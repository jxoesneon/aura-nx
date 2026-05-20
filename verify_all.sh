#!/bin/bash
set -e

echo "=== Aura-NX Institutional-Grade Verification Suite ==="
echo ""

# 1. PC MCP Server Unit Tests
echo "--- [1/3] Running PC MCP Server Unit Tests (Vitest) ---"
cd mcp-server
# Ensure dependencies are installed for the test environment
# npm install --silent
npx vitest run ../tests/unit-mcp/mcp_logic.test.ts
cd ..

# 2. Client Library Unit Tests (Host-side C++)
echo ""
echo "--- [2/3] Running Client Library Unit Tests (Host C++) ---"
cd tests/unit-client
make clean > /dev/null
make test
cd ../..

# 3. Full Integration Test (Simulated Hardware)
echo ""
echo "--- [3/3] Running Full E2E Integration Test (Simulated Hardware) ---"
# Note: This requires the MCP server to be runnable
npx vitest run tests/integration/e2e.test.ts

echo ""
echo "======================================================="
echo "   All Aura-NX Verification Tiers Passed Successfully! "
echo "======================================================="
