import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Aura-NX extension is now active');

    const targetProvider = new AuraTargetProvider();
    vscode.window.registerTreeDataProvider('auraTargets', targetProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('aura.refreshTargets', () => {
            targetProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aura.captureScreen', async (target?: AuraTarget) => {
            const ip = target?.ip || await vscode.window.showInputBox({ prompt: 'Enter Device IP' });
            if (!ip) return;

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Aura: Capturing Screen...",
                cancellable: false
            }, async (progress) => {
                try {
                    // In a real implementation, this would call the MCP tool.
                    // For now, we'll simulate the call.
                    await vscode.commands.executeCommand('aura-nx.capture_screen', { ip });
                    vscode.window.showInformationMessage(`Screenshot captured from ${ip}`);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Failed to capture screen: ${err.message}`);
                }
            });
        })
    );
}

class AuraTarget extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly ip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.ip})`;
        this.description = this.ip;
        this.contextValue = 'auraTarget';
    }

    iconPath = new vscode.ThemeIcon('device-mobile');
}

class AuraTargetProvider implements vscode.TreeDataProvider<AuraTarget> {
    private _onDidChangeTreeData: vscode.EventEmitter<AuraTarget | undefined | void> = new vscode.EventEmitter<AuraTarget | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<AuraTarget | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AuraTarget): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AuraTarget): Promise<AuraTarget[]> {
        if (element) {
            return [];
        } else {
            // Mock discovery - in real life, read from DB or MCP server
            return [
                new AuraTarget('Switch-Lab', '192.168.1.50', vscode.TreeItemCollapsibleState.None),
                new AuraTarget('Switch-Dev', '192.168.1.51', vscode.TreeItemCollapsibleState.None)
            ];
        }
    }
}

export function deactivate() {}
