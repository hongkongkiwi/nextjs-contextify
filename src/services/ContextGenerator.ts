import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../core/FileScanner';
import { FileInfo, ContextStats, GenerationOptions, UIGenerationOptions } from '../core/types';

export class ContextGenerator {
  private rootPath: string;
  private scanner: FileScanner;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.scanner = new FileScanner(rootPath);
  }

  async generateContext(
    options: GenerationOptions,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    const { files, stats } = await this.scanner.scanAndProcessFiles(progress);

    const timestamp = new Date().toISOString();
    const output = this.buildOutput(files, stats, options, timestamp);

    await this.saveOutput(output, options);

    if (vscode.workspace.getConfiguration('nextjsContextify').get('autoOpenOutput')) {
      await this.openOutput(options);
    }
  }

  async generateContextWithUI(
    options: UIGenerationOptions,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    const { files, stats } = await this.scanner.scanAndProcessFiles(progress);

    // Filter files based on UI selection
    const filteredFiles = options.selectedFiles
      ? files.filter(file => options.selectedFiles!.includes(file.path))
      : files;

    const timestamp = new Date().toISOString();
    const output = this.buildUIOutput(filteredFiles, stats, options, timestamp);

    await this.saveOutput(output, options);

    if (vscode.workspace.getConfiguration('nextjsContextify').get('autoOpenOutput')) {
      await this.openOutput(options);
    }
  }

  private buildOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: GenerationOptions,
    timestamp: string
  ): string {
    switch (options.format) {
      case 'xml':
        return this.buildXMLOutput(files, stats, timestamp, options);
      case 'markdown':
        return this.buildMarkdownOutput(files, stats, timestamp, options);
      case 'json':
        return this.buildJSONOutput(files, stats, timestamp, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private buildUIOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UIGenerationOptions,
    timestamp: string
  ): string {
    const baseOutput = this.buildOutput(files, stats, options, timestamp);

    // Add custom user input if provided
    if (options.userPrompt || options.rules || options.selectedPrompt) {
      const customSection = this.buildCustomSection(options);
      return baseOutput + '\n\n' + customSection;
    }

    return baseOutput;
  }

  private buildCustomSection(options: UIGenerationOptions): string {
    let section = '';

    if (options.selectedPrompt) {
      section += `\n## Selected Prompt Template\n${options.selectedPrompt}\n`;
    }

    if (options.userPrompt) {
      section += `\n## User Instructions\n${options.userPrompt}\n`;
    }

    if (options.rules && options.rules.length > 0) {
      section += `\n## Custom Rules\n`;
      options.rules.forEach((rule, index) => {
        section += `${index + 1}. ${rule}\n`;
      });
    }

    return section;
  }

  private buildXMLOutput(
    files: FileInfo[],
    stats: ContextStats,
    timestamp: string,
    options: GenerationOptions
  ): string {
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    let output = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    output += `<codebase>\n`;
    output += `  <metadata>\n`;
    output += `    <timestamp>${timestamp}</timestamp>\n`;
    output += `    <rootPath>${this.escapeXML(this.rootPath)}</rootPath>\n`;
    output += `    <totalFiles>${stats.totalFiles}</totalFiles>\n`;
    output += `    <totalTokens>${stats.totalTokens}</totalTokens>\n`;
    output += `    <totalSize>${stats.totalSize}</totalSize>\n`;
    output += `    <targetLLM>${options.targetLLM}</targetLLM>\n`;
    output += `  </metadata>\n\n`;

    // Add categories summary
    output += `  <categories>\n`;
    Object.entries(stats.categories).forEach(([category, count]) => {
      output += `    <category name="${this.escapeXML(category)}" count="${count}" />\n`;
    });
    output += `  </categories>\n\n`;

    // Add files
    output += `  <files>\n`;
    sortedFiles.forEach(file => {
      output += `    <file>\n`;
      output += `      <path>${this.escapeXML(file.path)}</path>\n`;
      output += `      <category>${this.escapeXML(file.category)}</category>\n`;
      output += `      <priority>${file.priority}</priority>\n`;
      output += `      <tokens>${file.tokens}</tokens>\n`;
      output += `      <size>${file.size}</size>\n`;
      output += `      <content><![CDATA[${file.content}]]></content>\n`;
      output += `    </file>\n\n`;
    });
    output += `  </files>\n`;

    if (options.includePrompts) {
      output += this.generatePromptSuggestions(stats, options.targetLLM);
    }

    output += `</codebase>\n`;
    return output;
  }

  private buildMarkdownOutput(
    files: FileInfo[],
    stats: ContextStats,
    timestamp: string,
    options: GenerationOptions
  ): string {
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    let output = `# Next.js Codebase Context\n\n`;
    output += `**Generated:** ${timestamp}\n`;
    output += `**Root Path:** ${this.rootPath}\n`;
    output += `**Target LLM:** ${options.targetLLM}\n\n`;

    // Statistics
    output += `## Statistics\n\n`;
    output += `- **Total Files:** ${stats.totalFiles}\n`;
    output += `- **Total Tokens:** ${stats.totalTokens.toLocaleString()}\n`;
    output += `- **Total Size:** ${(stats.totalSize / 1024).toFixed(2)} KB\n\n`;

    // Categories
    output += `## File Categories\n\n`;
    Object.entries(stats.categories).forEach(([category, count]) => {
      output += `- **${category}:** ${count} files\n`;
    });
    output += '\n';

    // Files
    output += `## Files\n\n`;
    sortedFiles.forEach(file => {
      output += `### ${file.path}\n\n`;
      output += `- **Category:** ${file.category}\n`;
      output += `- **Priority:** ${file.priority}\n`;
      output += `- **Tokens:** ${file.tokens}\n`;
      output += `- **Size:** ${file.size} bytes\n\n`;

      const extension = path.extname(file.path).slice(1);
      output += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
    });

    if (options.includePrompts) {
      output += this.generatePromptSuggestions(stats, options.targetLLM);
    }

    return output;
  }

  private buildJSONOutput(
    files: FileInfo[],
    stats: ContextStats,
    timestamp: string,
    options: GenerationOptions
  ): string {
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    const output = {
      metadata: {
        timestamp,
        rootPath: this.rootPath,
        targetLLM: options.targetLLM,
        stats,
      },
      files: sortedFiles,
      prompts: options.includePrompts ? this.getPromptTemplates(options.targetLLM) : null,
    };

    return JSON.stringify(output, null, 2);
  }

  private generatePromptSuggestions(_stats: ContextStats, _targetLLM: string): string {
    // Implementation for prompt suggestions
    return `\n  <prompts></prompts>\n`;
  }

  private getPromptTemplates(_targetLLM: string): any[] {
    // Implementation for prompt templates
    return [];
  }

  private async saveOutput(output: string, options: GenerationOptions): Promise<void> {
    const extension = this.getFileExtension(options.format);
    const filename = `nextjs-context-${Date.now()}.${extension}`;
    const filepath = path.join(this.rootPath, filename);

    await fs.promises.writeFile(filepath, output, 'utf8');
  }

  private async openOutput(options: GenerationOptions): Promise<void> {
    const extension = this.getFileExtension(options.format);
    const files = await vscode.workspace.findFiles(`nextjs-context-*.${extension}`);

    if (files.length > 0) {
      const latestFile = files.sort(
        (a, b) => fs.statSync(b.fsPath).mtime.getTime() - fs.statSync(a.fsPath).mtime.getTime()
      )[0];

      const document = await vscode.workspace.openTextDocument(latestFile);
      await vscode.window.showTextDocument(document);
    }
  }

  private getFileExtension(format: string): string {
    switch (format) {
      case 'xml':
        return 'xml';
      case 'markdown':
        return 'md';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  }

  private escapeXML(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
