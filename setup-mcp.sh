#!/bin/bash

# Aura-NX MCP 1-click Setup Script
# Automatically registers the Aura-NX MCP server in various AI code editors.

# Get the absolute path to the mcp-server entry point
REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_SERVER_PATH="$REPO_ROOT/mcp-server/src/index.ts"

if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "Error: MCP server entry point not found at $MCP_SERVER_PATH"
    exit 1
fi

# Define configuration paths for supported editors
declare -A CONFIG_PATHS
# Standard Locations
CONFIG_PATHS["claude-desktop"]="$HOME/.config/Claude/claude_desktop_config.json"
CONFIG_PATHS["claude-desktop-mac"]="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CONFIG_PATHS["gemini-cli"]="$HOME/.gemini/mcp_config.json"
CONFIG_PATHS["codex"]="$HOME/.codex/mcp.json"
CONFIG_PATHS["opencode"]="$HOME/.opencode/mcp.json"
CONFIG_PATHS["cursor"]="$HOME/.cursor/mcp.json"
CONFIG_PATHS["windsurf"]="$HOME/.windsurf/mcp.json"
CONFIG_PATHS["cline"]="$HOME/.cline/mcp.json"
CONFIG_PATHS["continue"]="$HOME/.continue/config.json"
CONFIG_PATHS["roocode"]="$HOME/.roocode/mcp.json"

# Additional Editors/Clients
CONFIG_PATHS["zed"]="$HOME/.config/zed/settings.json"
CONFIG_PATHS["pearai"]="$HOME/.pearai/mcp.json"
CONFIG_PATHS["supermaven"]="$HOME/.supermaven/mcp.json"
CONFIG_PATHS["tabnine"]="$HOME/.tabnine/mcp.json"
CONFIG_PATHS["cody"]="$HOME/.cody/mcp.json"
CONFIG_PATHS["openrouter"]="$HOME/.openrouter/mcp.json"
CONFIG_PATHS["poe"]="$HOME/.poe/mcp.json"
CONFIG_PATHS["perplexity"]="$HOME/.perplexity/mcp.json"
CONFIG_PATHS["idx"]="$HOME/.idx/mcp.json"
CONFIG_PATHS["replit"]="$HOME/.replit/mcp.json"

# Helper function to update JSON config using Python
update_json_config() {
    local config_file="$1"
    local editor_name="$2"
    
    echo "Updating $editor_name configuration at $config_file..."
    
    # Ensure directory exists
    mkdir -p "$(dirname "$config_file")"
    
    # Use Python for safe JSON manipulation
    python3 - <<EOF
import json
import os

path = "$config_file"
mcp_entry = {
    "command": "npx",
    "args": ["ts-node", "$MCP_SERVER_PATH"]
}

# Load existing config or start with empty template
data = {}
if os.path.exists(path):
    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Warning: Could not parse existing config: {e}")

# Ensure mcpServers key exists
if "mcpServers" not in data:
    data["mcpServers"] = {}

# Add or update the Aura-NX server
data["mcpServers"]["aura-nx"] = mcp_entry

# Write back to file
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
EOF
    
    if [ $? -eq 0 ]; then
        echo "Successfully added Aura-NX to $editor_name."
    else
        echo "Failed to update $editor_name configuration."
    fi
}

# Special case for Aider (YAML-ish/Conf)
update_aider_config() {
    local config_file="$HOME/.aider.conf.yml"
    echo "Updating Aider configuration at $config_file..."
    mkdir -p "$(dirname "$config_file")"
    
    # Check if entry already exists
    if grep -q "aura-nx" "$config_file" 2>/dev/null; then
        echo "Aura-NX already present in Aider config."
    else
        # Append simple YAML entry
        cat >> "$config_file" <<EOF

mcp-servers:
  aura-nx:
    command: npx
    args:
      - ts-node
      - $MCP_SERVER_PATH
EOF
        echo "Successfully added Aura-NX to Aider."
    fi
}

# Main Logic
SELECTED_EDITOR="$1"

if [ -n "$SELECTED_EDITOR" ]; then
    # Case insensitive check
    SELECTED_EDITOR_LOWER=$(echo "$SELECTED_EDITOR" | tr '[:upper:]' '[:lower:]')
    
    if [ "$SELECTED_EDITOR_LOWER" == "aider" ]; then
        update_aider_config
    elif [ -n "${CONFIG_PATHS[$SELECTED_EDITOR_LOWER]}" ]; then
        update_json_config "${CONFIG_PATHS[$SELECTED_EDITOR_LOWER]}" "$SELECTED_EDITOR"
    else
        echo "Unknown editor: $SELECTED_EDITOR"
        echo "Supported editors: ${!CONFIG_PATHS[@]} aider"
        exit 1
    fi
else
    # Automatic detection: check which config directories already exist
    echo "No editor specified. Attempting auto-detection..."
    DETECTED=0
    
    # Check Aider
    if [ -d "$HOME/.aider" ] || [ -f "$HOME/.aider.conf.yml" ]; then
        update_aider_config
        DETECTED=1
    fi
    
    # Check JSON-based editors
    for editor in "${!CONFIG_PATHS[@]}"; do
        config_path="${CONFIG_PATHS[$editor]}"
        if [ -d "$(dirname "$config_path")" ]; then
            update_json_config "$config_path" "$editor"
            DETECTED=1
        fi
    done
    
    if [ $DETECTED -eq 0 ]; then
        echo "No supported editor directories detected."
        echo "Please specify an editor as an argument (e.g., ./setup-mcp.sh cursor)"
    fi
fi

echo "Aura-NX MCP setup process finished."
