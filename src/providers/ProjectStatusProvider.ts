import * as vscode from 'vscode';
import { ProjectValidator, ProjectValidation } from '../services/ProjectValidator';

export class ProjectStatusProvider implements vscode.TreeDataProvider<ProjectStatusItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectStatusItem | undefined | null | void> = new vscode.EventEmitter<ProjectStatusItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectStatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private projectValidator: ProjectValidator | null = null;
  private validation: ProjectValidation | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async updateProject(rootPath: string): Promise<void> {
    this.projectValidator = new ProjectValidator(rootPath);
    this.validation = await this.projectValidator.validateProject();
    this.refresh();
  }

  getTreeItem(element: ProjectStatusItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectStatusItem): Promise<ProjectStatusItem[]> {
    if (!this.validation) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        await this.updateProject(workspaceFolder.uri.fsPath);
      }
    }

    if (!element) {
      // Root level items
      if (!this.validation) {
        return [
          new ProjectStatusItem(
            'No workspace found',
            'Open a folder to get started',
            vscode.TreeItemCollapsibleState.None,
            'warning'
          )
        ];
      }

      if (this.validation.isValidProject) {
        return [
          new ProjectStatusItem(
            '✅ Next.js Project Detected',
            `Version: ${this.validation.nextjsVersion || 'Unknown'}`,
            vscode.TreeItemCollapsibleState.None,
            'check'
          ),
          new ProjectStatusItem(
            'Ready to generate context',
            'Use commands or file tree to get started',
            vscode.TreeItemCollapsibleState.None,
            'rocket'
          )
        ];
      }

      // Non-Next.js project
      const items: ProjectStatusItem[] = [
        new ProjectStatusItem(
          '⚠️ Not a Next.js Project',
          this.validation.reason || 'Unknown reason',
          vscode.TreeItemCollapsibleState.Expanded,
          'warning'
        )
      ];

      return items;
    } else {
      // Child items for expanded nodes
      if (element.label === '⚠️ Not a Next.js Project' && this.validation) {
        const suggestions = this.validation.suggestions || [];
        const items: ProjectStatusItem[] = [];

        if (this.validation.projectType === 'nodejs') {
          items.push(
            new ProjectStatusItem(
              'Node.js project detected',
              'This extension requires Next.js',
              vscode.TreeItemCollapsibleState.None,
              'info'
            )
          );
        }

        suggestions.forEach(suggestion => {
          items.push(
            new ProjectStatusItem(
              suggestion,
              '',
              vscode.TreeItemCollapsibleState.None,
              'lightbulb'
            )
          );
        });

        items.push(
          new ProjectStatusItem(
            'Create Next.js Project',
            'Click to learn how',
            vscode.TreeItemCollapsibleState.None,
            'add',
            {
              command: 'nextjsLlmContext.learnNextJs',
              title: 'Learn about Next.js'
            }
          )
        );

        return items;
      }
    }

    return [];
  }
}

class ProjectStatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconName: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    this.description = description;
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.command = command;
    
    // Add context value for command visibility
    this.contextValue = 'projectStatusItem';
  }
} 