import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IgnoreService } from '../utils/IgnoreService';
import { FileTreeItem } from '../core/types';

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> =
    new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private _onSelectionChanged: vscode.EventEmitter<string[]> = new vscode.EventEmitter<string[]>();
  readonly onSelectionChanged: vscode.Event<string[]> = this._onSelectionChanged.event;

  private selectedFiles: Set<string> = new Set();
  private rootPath: string = '';
  private ignoreService: IgnoreService;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.rootPath = workspaceFolders[0].uri.fsPath;
      this.ignoreService = new IgnoreService(this.rootPath);
      this.loadPersistedSelection();
    } else {
      // Fallback for when no workspace is open
      this.ignoreService = new IgnoreService('');
    }
  }

  private getStorageKey(): string {
    return `nextjsLlmContext.selectedFiles.${this.rootPath}`;
  }

  private loadPersistedSelection(): void {
    const stored = this.context.globalState.get<string[]>(this.getStorageKey());
    if (stored) {
      this.selectedFiles = new Set(stored);
      this.notifySelectionChanged();
    }
  }

  private saveSelection(): void {
    this.context.globalState.update(this.getStorageKey(), Array.from(this.selectedFiles));
  }

  private notifySelectionChanged(): void {
    const selectedFiles = Array.from(this.selectedFiles);
    console.log('Selection changed:', selectedFiles.length, 'items');
    this._onSelectionChanged.fire(selectedFiles);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.notifySelectionChanged();
  }

  selectAll(): void {
    this.getAllFiles().forEach(file => this.selectedFiles.add(file));
    this.saveSelection();
    this.notifySelectionChanged();
    this.refresh();
  }

  deselectAll(): void {
    this.selectedFiles.clear();
    this.saveSelection();
    this.notifySelectionChanged();
    this.refresh();
    console.log('Deselected all files - selectedFiles size:', this.selectedFiles.size);
  }

  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
    if (!this.rootPath) {
      return Promise.resolve([]);
    }

    if (!element) {
      return Promise.resolve(this.getFilesInDirectory(this.rootPath));
    } else if (element.isDirectory && element.resourceUri) {
      return Promise.resolve(this.getFilesInDirectory(element.resourceUri.fsPath));
    }

    return Promise.resolve([]);
  }

  private getFilesInDirectory(dirPath: string): FileTreeItem[] {
    const items: FileTreeItem[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.rootPath, fullPath);

        if (this.ignoreService.shouldIgnore(relativePath)) {
          continue;
        }

        const isSelected = this.selectedFiles.has(relativePath);
        let hasSelectedChildren = false;

        if (entry.isDirectory()) {
          for (const selectedPath of this.selectedFiles) {
            if (selectedPath.startsWith(relativePath + '/')) {
              hasSelectedChildren = true;
              break;
            }
          }
        }

        const item: FileTreeItem = {
          label: entry.name,
          resourceUri: vscode.Uri.file(fullPath),
          isSelected,
          isDirectory: entry.isDirectory(),
          collapsibleState: entry.isDirectory()
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          contextValue: entry.isDirectory() ? 'directory' : 'file',
          iconPath: entry.isDirectory() ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File,
          checkboxState: isSelected
            ? vscode.TreeItemCheckboxState.Checked
            : hasSelectedChildren
              ? vscode.TreeItemCheckboxState.Checked
              : vscode.TreeItemCheckboxState.Unchecked,
        };

        items.push(item);
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) {
        return -1;
      }
      if (!a.isDirectory && b.isDirectory) {
        return 1;
      }
      return (a.label as string).localeCompare(b.label as string);
    });
  }

  private getAllFiles(): string[] {
    const files: string[] = [];
    this.scanDirectoryForFiles(this.rootPath, files);
    return files;
  }

  private scanDirectoryForFiles(dirPath: string, files: string[]): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.rootPath, fullPath);

        if (this.ignoreService.shouldIgnore(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          this.scanDirectoryForFiles(fullPath, files);
        } else {
          files.push(relativePath);
        }
      }
    } catch (error) {
      console.error('Error scanning directory for files:', error);
    }
  }

  toggleSelection(item: FileTreeItem): void {
    if (!item.resourceUri) {
      return;
    }

    const relativePath = path.relative(this.rootPath, item.resourceUri.fsPath);

    if (item.isDirectory) {
      this.toggleDirectorySelection(relativePath, item.resourceUri.fsPath);
    } else {
      if (this.selectedFiles.has(relativePath)) {
        this.selectedFiles.delete(relativePath);
      } else {
        this.selectedFiles.add(relativePath);
      }
    }

    this.saveSelection();
    this.notifySelectionChanged();
    this.refresh();
  }

  private toggleDirectorySelection(relativePath: string, fullPath: string): void {
    const isSelected = this.selectedFiles.has(relativePath);

    if (isSelected) {
      this.deselectDirectoryAndContents(relativePath, fullPath);
    } else {
      this.selectDirectoryAndContents(relativePath, fullPath);
    }
  }

  private selectDirectoryAndContents(relativePath: string, fullPath: string): void {
    this.selectedFiles.add(relativePath);
    const allItems = this.getAllItemsInDirectory(fullPath);
    allItems.forEach(item => this.selectedFiles.add(item));
  }

  private deselectDirectoryAndContents(relativePath: string, fullPath: string): void {
    this.selectedFiles.delete(relativePath);
    const allItems = this.getAllItemsInDirectory(fullPath);
    allItems.forEach(item => this.selectedFiles.delete(item));
  }

  private getAllItemsInDirectory(dirPath: string): string[] {
    const items: string[] = [];
    this.scanDirectoryForAllItems(dirPath, items);
    return items;
  }

  private scanDirectoryForAllItems(dirPath: string, items: string[]): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.rootPath, fullPath);

        if (this.ignoreService.shouldIgnore(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          items.push(relativePath);
          this.scanDirectoryForAllItems(fullPath, items);
        } else {
          items.push(relativePath);
        }
      }
    } catch (error) {
      console.error('Error scanning directory for all items:', error);
    }
  }

  getSelectedFiles(): string[] {
    return Array.from(this.selectedFiles);
  }

  getSelectedFilesAndDirectories(): string[] {
    return Array.from(this.selectedFiles);
  }
}
