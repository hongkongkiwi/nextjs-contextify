import * as vscode from 'vscode';
import * as path from 'path';
import { UniversalContextGenerator } from './services/UniversalContextGenerator';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { ProjectStatusProvider } from './providers/ProjectStatusProvider';
import { Logger } from './utils/Logger';
import { OutputFormat, TargetLLM } from './core/types';
import { ProjectValidator, ProjectValidation } from './services/ProjectValidator';

export function activate(context: vscode.ExtensionContext) {
  Logger.info('Next.js LLM Context extension is now active with enhanced architecture!');

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
      try {
        projectValidator = new ProjectValidator(workspaceFolder.uri.fsPath);
        isNextJsProject = await projectValidator.isValidNextJsProject();
        
        // Set context for conditional UI display
        await vscode.commands.executeCommand('setContext', 'nextjsLlmContext.isNextJsProject', isNextJsProject);
        
        // Update project status provider
        await projectStatusProvider.updateProject(workspaceFolder.uri.fsPath);
        
        if (!isNextJsProject) {
          Logger.info('Current workspace is not a Next.js project - extension features will be limited');
        }
      } catch (error) {
        Logger.error('Failed to validate workspace:', error as Error);
        isNextJsProject = false;
        await vscode.commands.executeCommand('setContext', 'nextjsLlmContext.isNextJsProject', false);
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

  // Enhanced helper function to validate project before command execution
  const validateProjectForCommand = async (): Promise<ProjectValidation | null> => {
    try {
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
    } catch (error) {
      Logger.error('Project validation failed:', error as Error);
      vscode.window.showErrorMessage('Failed to validate project. Please check the logs for details.');
      return null;
    }
  };

  // Enhanced context generation with error handling and optimization
  const generateContextWithEnhancements = async (
    assistantTypes: string[],
    options: any,
    progressMessage: string
  ) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const generator = new UniversalContextGenerator(workspaceFolder.uri.fsPath);
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: progressMessage,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 10, message: 'Initializing...' });
        
        progress.report({ increment: 30, message: 'Scanning files...' });
        const results = await generator.generateUniversalContext(assistantTypes as any, options);

        progress.report({ increment: 80, message: 'Saving results...' });
        
        // Save the results with enhanced error handling
        let savedCount = 0;
        for (const result of results) {
          try {
            const filePath = path.join(workspaceFolder.uri.fsPath, result.filename);
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(filePath), 
              Buffer.from(result.content, 'utf8')
            );
            savedCount++;
          } catch (error) {
            Logger.error(`Failed to save ${result.filename}:`, error as Error);
            // Continue with other files
          }
        }

        progress.report({ increment: 100, message: 'Complete!' });

        // Show enhanced success message with stats
        if (savedCount > 0) {
          const totalTokens = results.reduce((sum, r) => sum + (r.stats?.totalTokens || 0), 0);
          const totalFiles = results.reduce((sum, r) => sum + (r.stats?.totalFiles || 0), 0);
          
          vscode.window.showInformationMessage(
            `✅ Generated ${savedCount} context file(s)! ${totalFiles} files processed, ~${totalTokens.toLocaleString()} tokens.`
          );
        } else {
          vscode.window.showWarningMessage('Context generation completed but no files were saved.');
        }

        // Auto-open first file if configured
        if (vscode.workspace.getConfiguration('nextjsLlmContext').get('autoOpenOutput') && results.length > 0) {
          const firstFile = path.join(workspaceFolder.uri.fsPath, results[0].filename);
          const uri = vscode.Uri.file(firstFile);
          await vscode.window.showTextDocument(uri);
        }
      });
    } catch (error) {
      Logger.error('Context generation failed:', error as Error);
      vscode.window.showErrorMessage(
        `Context generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
      if (!validation) {return;}
      
      // Redirect to the universal context generator
      await vscode.commands.executeCommand('nextjsLlmContext.generateUniversalContext');
    }
  );

  const generateQuickContextCommand = vscode.commands.registerCommand(
    'extension.generateQuickContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
      // Enhanced quick XML generation
      await generateContextWithEnhancements(
        ['Universal'],
        {
          format: OutputFormat.XML,
          includePrompts: false,
          targetLLM: TargetLLM.CLAUDE,
          includeProjectSummary: true,
          includeFileStructure: true,
          includeCodeMetrics: false,
          useMarkdownTables: false,
          includeLineNumbers: false,
          addSectionAnchors: false,
          compactFormat: true,
          maxTokensPerFile: 1000
        },
        'Generating quick XML context...'
      );
    }
  );

  const generateWithPromptsCommand = vscode.commands.registerCommand(
    'extension.generateWithPrompts',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
      // Enhanced generation with prompts
      await generateContextWithEnhancements(
        ['Claude'],
        {
          format: OutputFormat.MARKDOWN,
          includePrompts: true,
          targetLLM: TargetLLM.CLAUDE,
          includeProjectSummary: true,
          includeFileStructure: true,
          includeCodeMetrics: true,
          useMarkdownTables: true,
          includeLineNumbers: false,
          addSectionAnchors: true,
        },
        'Generating context with prompts...'
      );
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
      if (!validation) {return;}
      
      fileTreeProvider.refresh();
      vscode.window.showInformationMessage('File explorer refreshed!');
    }
  );

  const selectAllCommand = vscode.commands.registerCommand(
    'nextjsLlmContextExplorer.selectAll',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
      fileTreeProvider.selectAll();
      vscode.window.showInformationMessage('All files selected!');
    }
  );

  const deselectAllCommand = vscode.commands.registerCommand(
    'nextjsLlmContextExplorer.deselectAll',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
      fileTreeProvider.deselectAll();
      vscode.window.showInformationMessage('All files deselected!');
    }
  );

  // Main context generation command (used by tests and UI)
  const generateContextCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.generateContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
      // Use the universal context generator
      await vscode.commands.executeCommand('nextjsLlmContext.generateUniversalContext');
    }
  );

  // Enhanced universal context generation command
  const generateUniversalContextCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.generateUniversalContext',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
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

      // Enhanced optimization selection with token cost estimates
      const optimizationChoice = await vscode.window.showQuickPick([
        { 
          label: '🚀 Maximum Savings (70-80% reduction)', 
          value: 'aggressive',
          detail: 'Best for cost optimization, includes only essential files'
        },
        { 
          label: '⚖️ Balanced (40-60% reduction)', 
          value: 'balanced',
          detail: 'Good balance between completeness and cost'
        },
        { 
          label: '📄 Full Context (No optimization)', 
          value: 'none',
          detail: 'Complete project context, higher token usage'
        }
      ], {
        placeHolder: 'Select optimization level to save AI token costs'
      });

      // Get optimization options based on selection
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

      const finalOptions = {
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
      };

      await generateContextWithEnhancements(
        selectedFormats,
        finalOptions,
        `Generating context for: ${formatNames}...`
      );
    }
  );

  // Enhanced ignore file creation command
  const createIgnoreFileCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.createIgnoreFile',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
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

        let successCount = 0;
        for (const option of selected) {
          try {
            const filePath = vscode.Uri.joinPath(workspaceFolder.uri, option.value);
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(template, 'utf8'));
            successCount++;
          } catch (error) {
            Logger.error(`Failed to create ${option.value}:`, error as Error);
          }
        }

        if (successCount > 0) {
          vscode.window.showInformationMessage(`Created ${successCount} ignore file(s) successfully!`);
        } else {
          vscode.window.showErrorMessage('Failed to create ignore files. Check the logs for details.');
        }
      } catch (error) {
        Logger.error('Failed to create ignore files:', error as Error);
        vscode.window.showErrorMessage(`Failed to create ignore files: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Refresh file tree command
  const refreshCommand = vscode.commands.registerCommand(
    'nextjsLlmContext.refresh',
    async () => {
      const validation = await validateProjectForCommand();
      if (!validation) {return;}
      
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

  // Enhanced configuration change listener
  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('nextjsLlmContext')) {
      Logger.info('Configuration changed, refreshing providers...');
      fileTreeProvider.refresh();
    }
  });

  Logger.info('All commands registered successfully with enhanced error handling and architecture');
}

export function deactivate() {
  Logger.info('Next.js LLM Context extension deactivated');
} 