import * as vscode from 'vscode';
import * as path from 'path';
import { UniversalContextGenerator } from './services/UniversalContextGenerator';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { ProjectStatusProvider } from './providers/ProjectStatusProvider';
import { Logger } from './utils/Logger';
import { OutputFormat, TargetLLM } from './core/types';
import { ProjectValidator, ProjectValidation } from './services/ProjectValidator';


export function activate(context: vscode.ExtensionContext) {
  Logger.info('Next.js LLM Context extension is now active!');

  // Initialize providers
  const fileTreeProvider = new FileTreeProvider(context);
  const projectStatusProvider = new ProjectStatusProvider(context);
  vscode.window.registerTreeDataProvider('nextjsLlmContextExplorer', fileTreeProvider);
  vscode.window.registerTreeDataProvider('nextjsLlmContextStatus', projectStatusProvider);

  // Set up project validation context
  let projectValidator: ProjectValidator | null = null;
  let isNextJsProject = false;

  // Initialize project validation when workspace changes
  const updateProjectContext = async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      projectValidator = new ProjectValidator(workspaceFolder.uri.fsPath);
      isNextJsProject = await projectValidator.isValidNextJsProject();
      
      // Set context for conditional UI display
      await vscode.commands.executeCommand('setContext', 'nextjsLlmContext.isNextJsProject', isNextJsProject);
      
      // Update project status provider
      await projectStatusProvider.updateProject(workspaceFolder.uri.fsPath);
      
      if (!isNextJsProject) {
        Logger.info('Current workspace is not a Next.js project - extension features will be limited');
      }
    } else {
      isNextJsProject = false;
      await vscode.commands.executeCommand('setContext', 'nextjsLlmContext.isNextJsProject', false);
      projectStatusProvider.refresh();
    }
  };

  // Initial project validation
  updateProjectContext();

  // Re-validate when workspace folders change
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(updateProjectContext)
  );

  // Helper function to validate project before command execution
  const validateProjectForCommand = async (): Promise<ProjectValidation | null> => {
    if (!projectValidator) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return null;
      }
      projectValidator = new ProjectValidator(workspaceFolder.uri.fsPath);
    }

    const validation = await projectValidator.validateProject();
    
    if (!validation.isValidProject) {
      const errorMessage = projectValidator.generateErrorMessage(validation);
      const action = await vscode.window.showErrorMessage(
        'This extension only works with Next.js projects',
        { modal: true, detail: errorMessage },
        'Learn More'
      );
      
      if (action === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://nextjs.org/docs/getting-started'));
      }
      
      return null;
    }

    return validation;
  };

  // Learn Next.js command for non-Next.js projects
  const learnNextJsCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.learnNextJs',
    async () => {
      const choice = await vscode.window.showInformationMessage(
        'Learn about Next.js and how to get started with this extension',
        'Open Next.js Docs',
        'Create New Project',
        'Extension Documentation'
      );

      switch (choice) {
        case 'Open Next.js Docs':
          vscode.env.openExternal(vscode.Uri.parse('https://nextjs.org/docs/getting-started'));
          break;
        case 'Create New Project':
          vscode.env.openExternal(vscode.Uri.parse('https://nextjs.org/docs/getting-started/installation'));
          break;
        case 'Extension Documentation':
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/nextjs-llm-context#readme'));
          break;
      }
    }
  );

  // Legacy command implementations for backward compatibility
  const generateCodeBaseContextCommand = vscode.commands.registerCommand(
    'extension.generateCodeBaseContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      // Redirect to the universal context generator
      await vscode.commands.executeCommand('nextjsLlmContext.generateUniversalContext');
    }
  );

  const generateQuickContextCommand = vscode.commands.registerCommand(
    'extension.generateQuickContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      // Quick XML generation
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      try {
        const generator = new UniversalContextGenerator(workspaceFolder.uri.fsPath);
        
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Generating quick XML context...',
          cancellable: false
        }, async () => {
                     const results = await generator.generateUniversalContext(['Universal'], {
            format: OutputFormat.XML,
            includePrompts: false,
            targetLLM: TargetLLM.CLAUDE,
            includeProjectSummary: true,
            includeFileStructure: true,
            includeCodeMetrics: false,
            useMarkdownTables: false,
            includeLineNumbers: false,
            addSectionAnchors: false,
          });

          // Save the first result
          if (results.length > 0) {
            const filePath = path.join(workspaceFolder.uri.fsPath, results[0].filename);
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(filePath), 
              Buffer.from(results[0].content, 'utf8')
            );
            vscode.window.showInformationMessage('✅ Quick XML context generated!');
          }
        });
      } catch (error) {
        Logger.error('Failed to generate quick context:', error instanceof Error ? error : new Error(String(error)));
        vscode.window.showErrorMessage(`Failed to generate context: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  const generateWithPromptsCommand = vscode.commands.registerCommand(
    'extension.generateWithPrompts',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      // Redirect to universal context generator with prompts enabled
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      try {
        const generator = new UniversalContextGenerator(workspaceFolder.uri.fsPath);
        
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Generating context with prompts...',
          cancellable: false
        }, async () => {
          const results = await generator.generateUniversalContext(['Claude'], {
            format: OutputFormat.MARKDOWN,
            includePrompts: true,
            targetLLM: TargetLLM.CLAUDE,
            includeProjectSummary: true,
            includeFileStructure: true,
            includeCodeMetrics: true,
            useMarkdownTables: true,
            includeLineNumbers: false,
            addSectionAnchors: true,
          });

          for (const result of results) {
            const filePath = path.join(workspaceFolder.uri.fsPath, result.filename);
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(filePath), 
              Buffer.from(result.content, 'utf8')
            );
          }

          vscode.window.showInformationMessage('✅ Context with prompts generated!');
        });
      } catch (error) {
        Logger.error('Failed to generate context with prompts:', error instanceof Error ? error : new Error(String(error)));
        vscode.window.showErrorMessage(`Failed to generate context: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  const openContextifyUICommand = vscode.commands.registerCommand(
    'extension.openContextifyUI',
    async () => {
      // Show the tree view focus
      await vscode.commands.executeCommand('nextjsLlmContextExplorer.focus');
      vscode.window.showInformationMessage('Next.js LLM Context UI is in the sidebar!');
    }
  );

  // Tree view commands
  const explorerRefreshCommand = vscode.commands.registerCommand(
    'nextjsLlmContextExplorer.refresh',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      fileTreeProvider.refresh();
      vscode.window.showInformationMessage('File explorer refreshed!');
    }
  );

  const selectAllCommand = vscode.commands.registerCommand(
    'nextjsLlmContextExplorer.selectAll',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      fileTreeProvider.selectAll();
      vscode.window.showInformationMessage('All files selected!');
    }
  );

  const deselectAllCommand = vscode.commands.registerCommand(
    'nextjsLlmContextExplorer.deselectAll',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      fileTreeProvider.deselectAll();
      vscode.window.showInformationMessage('All files deselected!');
    }
  );

  // Main context generation command (used by tests and UI)
  const generateContextCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.generateContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      // Use the existing universal context generator
      await vscode.commands.executeCommand('nextjsLlmContext.generateUniversalContext');
    }
  );

  // Universal context generation commands
  const generateUniversalContextCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.generateUniversalContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      // Show AI assistant selection with multi-select support
      const aiOptions = [
        { label: '🤖 Universal (All AI Assistants)', value: 'universal' },
        { label: '🧠 Claude (Anthropic)', value: 'claude' },
        { label: '🎯 Cursor', value: 'cursor' },
        { label: '🛠️ Roo', value: 'roo' },
        { label: '🌊 Windsurf', value: 'windsurf' },
        { label: '🤖 Cline', value: 'cline' },
      ];

      const selected = await vscode.window.showQuickPick(aiOptions, {
        placeHolder: 'Select AI assistant(s) to optimize for (multi-select supported)',
        canPickMany: true
      });

      if (!selected || selected.length === 0) {
        return;
      }

      const selectedFormats = selected.map(item => item.value as any);
      const formatNames = selected.map(item => item.label).join(', ');

      try {
        const generator = new UniversalContextGenerator(workspaceFolder.uri.fsPath);
        
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Generating context for: ${formatNames}...`,
          cancellable: false
        }, async (_progress) => {
          
          // Ask about token optimization
          const optimizationChoice = await vscode.window.showQuickPick([
            { label: '🚀 Maximum Savings (70-80% reduction)', value: 'aggressive' },
            { label: '⚖️ Balanced (40-60% reduction)', value: 'balanced' },
            { label: '📄 Full Context (No optimization)', value: 'none' }
          ], {
            placeHolder: 'Select optimization level to save AI token costs'
          });

          // Get optimization options
          let optimizationOptions = {};
          if (optimizationChoice?.value === 'aggressive') {
            optimizationOptions = {
              maxTotalFiles: 20,
              maxTokensPerFile: 1000,
              priorityThreshold: 7,
              excludeTechnologies: ['prisma', 'zenstack', 'drizzle'],
              summarizeContent: true,
              compactFormat: true
            };
          } else if (optimizationChoice?.value === 'balanced') {
            optimizationOptions = {
              maxTotalFiles: 50,
              maxTokensPerFile: 2000,
              priorityThreshold: 5,
              excludeLargeFiles: true
            };
          }

          const results = await generator.generateUniversalContext(selectedFormats, {
            // Required GenerationOptions properties
            format: OutputFormat.MARKDOWN,
            includePrompts: true,
            targetLLM: TargetLLM.CLAUDE,
            
            // UniversalContextOptions properties
            includeProjectSummary: true,
            includeFileStructure: true,
            includeCodeMetrics: true,
            useMarkdownTables: true,
            includeLineNumbers: false,
            addSectionAnchors: true,
            
            // Apply optimization options
            ...optimizationOptions
          });

          // Save the results
          for (const result of results) {
            const filePath = path.join(workspaceFolder.uri.fsPath, result.filename);
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(filePath), 
              Buffer.from(result.content, 'utf8')
            );
          }

          // Show token savings if optimization was applied
          if (optimizationChoice && optimizationChoice.value !== 'none') {
            const totalOptimizedTokens = results.reduce((sum, r) => sum + r.stats.totalTokens, 0);
            const savings = optimizationChoice.value === 'aggressive' ? 75 : 50;
            vscode.window.showInformationMessage(
              `✅ Context generated with ~${savings}% token savings! (${totalOptimizedTokens.toLocaleString()} tokens)`
            );
          } else {
            vscode.window.showInformationMessage(`✅ Context generated for: ${formatNames}!`);
          }

          // Auto-open first file if configured
          if (vscode.workspace.getConfiguration('nextjsLlmContext').get('autoOpenOutput') && results.length > 0) {
            const firstFile = path.join(workspaceFolder.uri.fsPath, results[0].filename);
            const uri = vscode.Uri.file(firstFile);
            await vscode.window.showTextDocument(uri);
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error('Failed to generate universal context:', error instanceof Error ? error : new Error(String(error)));
        vscode.window.showErrorMessage(`Failed to generate universal context: ${errorMessage}`);
      }
    }
  );

  // Create ignore file command
  const createIgnoreFileCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.createIgnoreFile',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      const ignoreOptions = [
        { label: '🤖 .aiignore (Universal)', value: '.aiignore' },
        { label: '🎯 .cursorignore (Cursor)', value: '.cursorignore' },
        { label: '🟦 .codiumignore (VSCodium)', value: '.codiumignore' },
        { label: '🤖 .clineignore (Cline)', value: '.clineignore' },
        { label: '🛠️ .rooignore (Roo)', value: '.rooignore' },
        { label: '🌊 .windsurfignore (Windsurf)', value: '.windsurfignore' },
        { label: '🧠 .claudeignore (Claude)', value: '.claudeignore' },
        { label: '📋 .nextjscollectorignore (Legacy)', value: '.nextjscollectorignore' },
      ];

      const selected = await vscode.window.showQuickPick(ignoreOptions, {
        placeHolder: 'Select ignore file type to create',
        canPickMany: true
      });

      if (!selected || selected.length === 0) {
        return;
      }

      try {
        const templatePath = vscode.Uri.joinPath(context.extensionUri, 'templates', '.aiignore');
        const templateContent = await vscode.workspace.fs.readFile(templatePath);
        const template = Buffer.from(templateContent).toString('utf8');

        for (const option of selected) {
          const filePath = vscode.Uri.joinPath(workspaceFolder.uri, option.value);
          await vscode.workspace.fs.writeFile(filePath, Buffer.from(template, 'utf8'));
        }

        vscode.window.showInformationMessage(`Created ${selected.length} ignore file(s) successfully!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error('Failed to create ignore file:', error instanceof Error ? error : new Error(String(error)));
        vscode.window.showErrorMessage(`Failed to create ignore file: ${errorMessage}`);
      }
    }
  );

  // Refresh file tree command
  const refreshCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.refresh',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) return;
      
      fileTreeProvider.refresh();
      vscode.window.showInformationMessage('File tree refreshed!');
    }
  );

  // Register all commands
  context.subscriptions.push(
    // Project validation commands
    learnNextJsCommand,
    // Legacy commands
    generateCodeBaseContextCommand,
    generateQuickContextCommand,
    generateWithPromptsCommand,
    openContextifyUICommand,
    // Tree view commands
    explorerRefreshCommand,
    selectAllCommand,
    deselectAllCommand,
    // Main commands
    generateContextCommand,
    generateUniversalContextCommand,
    createIgnoreFileCommand,
    refreshCommand
  );

  // Register configuration change listener
  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('nextjsLlmContext')) {
      Logger.info('Configuration changed, refreshing providers...');
      fileTreeProvider.refresh();
    }
  });

  Logger.info('All commands registered successfully');
}

export function deactivate() {
  Logger.info('Next.js LLM Context extension deactivated');
} 