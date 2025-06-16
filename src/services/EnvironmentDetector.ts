import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface EnvironmentFile {
  filename: string;
  exists: boolean;
  path: string;
  priority: number;
  description: string;
  variables?: Record<string, string>;
  publicVariables?: Record<string, string>;
  privateVariables?: Record<string, string>;
}

export interface EnvironmentAnalysis {
  files: EnvironmentFile[];
  loadOrder: string[];
  publicVariables: Record<string, string>;
  privateVariables: Record<string, string>;
  allVariables: Record<string, string>;
  nodeEnv: string;
  hasTestEnv: boolean;
  hasDevelopmentEnv: boolean;
  hasProductionEnv: boolean;
  hasLocalEnv: boolean;
}

/**
 * Detects and analyzes Next.js environment files according to the official documentation:
 * https://nextjs.org/docs/pages/guides/environment-variables
 * 
 * Load order (stopping once variable is found):
 * 1. process.env
 * 2. .env.$(NODE_ENV).local
 * 3. .env.local (Not checked when NODE_ENV is test)
 * 4. .env.$(NODE_ENV)
 * 5. .env
 */
export class EnvironmentDetector {
  private rootPath: string;
  private nodeEnv: string;

  constructor(rootPath: string, nodeEnv?: string) {
    this.rootPath = rootPath;
    this.nodeEnv = nodeEnv || process.env.NODE_ENV || 'development';
  }

  async analyzeEnvironmentFiles(): Promise<EnvironmentAnalysis> {
    try {
      const files = await this.detectEnvironmentFiles();
      const loadOrder = this.getLoadOrder();
      const { publicVariables, privateVariables, allVariables } = this.analyzeVariables(files);

      return {
        files,
        loadOrder,
        publicVariables,
        privateVariables,
        allVariables,
        nodeEnv: this.nodeEnv,
        hasTestEnv: files.some(f => f.filename.includes('.env.test')),
        hasDevelopmentEnv: files.some(f => f.filename.includes('.env.development')),
        hasProductionEnv: files.some(f => f.filename.includes('.env.production')),
        hasLocalEnv: files.some(f => f.filename.includes('.env.local'))
      };
    } catch (error) {
      Logger.error('Failed to analyze environment files:', error instanceof Error ? error : new Error(String(error)));
      return this.getEmptyAnalysis();
    }
  }

  private async detectEnvironmentFiles(): Promise<EnvironmentFile[]> {
    const envFiles: EnvironmentFile[] = [
      {
        filename: '.env',
        exists: false,
        path: '',
        priority: 5,
        description: 'Default environment variables for all environments'
      },
      {
        filename: `.env.${this.nodeEnv}`,
        exists: false,
        path: '',
        priority: 4,
        description: `Environment-specific variables for ${this.nodeEnv}`
      },
      {
        filename: '.env.local',
        exists: false,
        path: '',
        priority: 3,
        description: 'Local environment variables (ignored by git, not loaded in test)'
      },
      {
        filename: `.env.${this.nodeEnv}.local`,
        exists: false,
        path: '',
        priority: 2,
        description: `Local environment-specific variables for ${this.nodeEnv}`
      },
      // Additional environment files
      {
        filename: '.env.development',
        exists: false,
        path: '',
        priority: 6,
        description: 'Development environment variables'
      },
      {
        filename: '.env.production',
        exists: false,
        path: '',
        priority: 6,
        description: 'Production environment variables'
      },
      {
        filename: '.env.test',
        exists: false,
        path: '',
        priority: 6,
        description: 'Test environment variables'
      },
      {
        filename: '.env.development.local',
        exists: false,
        path: '',
        priority: 7,
        description: 'Local development environment variables'
      },
      {
        filename: '.env.production.local',
        exists: false,
        path: '',
        priority: 7,
        description: 'Local production environment variables'
      },
      {
        filename: '.env.test.local',
        exists: false,
        path: '',
        priority: 7,
        description: 'Local test environment variables'
      }
    ];

    for (const envFile of envFiles) {
      const filePath = path.join(this.rootPath, envFile.filename);
      envFile.path = filePath;
      envFile.exists = fs.existsSync(filePath);

      if (envFile.exists) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const variables = this.parseEnvFile(content);
          envFile.variables = variables;
          
          // Separate public and private variables
          envFile.publicVariables = {};
          envFile.privateVariables = {};

          Object.entries(variables).forEach(([key, value]) => {
            if (key.startsWith('NEXT_PUBLIC_')) {
              envFile.publicVariables![key] = value;
            } else {
              envFile.privateVariables![key] = value;
            }
          });
        } catch (error) {
          Logger.error(`Failed to read ${envFile.filename}:`, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    return envFiles.filter(f => f.exists);
  }

  private parseEnvFile(content: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        
        // Handle quoted values
        let parsedValue = value;
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          parsedValue = value.slice(1, -1);
        }

        // Handle variable references ($VARIABLE)
        parsedValue = this.expandVariables(parsedValue, variables);
        
        variables[key] = parsedValue;
      }
    }

    return variables;
  }

  private expandVariables(value: string, existingVars: Record<string, string>): string {
    return value.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, varName) => {
      return existingVars[varName] || process.env[varName] || match;
    });
  }

  private getLoadOrder(): string[] {
    const order = [
      'process.env',
      `.env.${this.nodeEnv}.local`,
      '.env.local',
      `.env.${this.nodeEnv}`,
      '.env'
    ];

    // .env.local is not checked when NODE_ENV is test
    if (this.nodeEnv === 'test') {
      return order.filter(file => file !== '.env.local');
    }

    return order;
  }

  private analyzeVariables(files: EnvironmentFile[]): {
    publicVariables: Record<string, string>;
    privateVariables: Record<string, string>;
    allVariables: Record<string, string>;
  } {
    const publicVariables: Record<string, string> = {};
    const privateVariables: Record<string, string> = {};
    const allVariables: Record<string, string> = {};

    // Sort files by priority (lower number = higher priority)
    const sortedFiles = files.sort((a, b) => a.priority - b.priority);

    for (const file of sortedFiles) {
      if (file.variables) {
        Object.entries(file.variables).forEach(([key, value]) => {
          // Only add if not already defined (higher priority files win)
          if (!allVariables[key]) {
            allVariables[key] = value;
            
            if (key.startsWith('NEXT_PUBLIC_')) {
              publicVariables[key] = value;
            } else {
              privateVariables[key] = value;
            }
          }
        });
      }
    }

    return { publicVariables, privateVariables, allVariables };
  }

  private getEmptyAnalysis(): EnvironmentAnalysis {
    return {
      files: [],
      loadOrder: this.getLoadOrder(),
      publicVariables: {},
      privateVariables: {},
      allVariables: {},
      nodeEnv: this.nodeEnv,
      hasTestEnv: false,
      hasDevelopmentEnv: false,
      hasProductionEnv: false,
      hasLocalEnv: false
    };
  }

  /**
   * Get environment files that should be included in the context
   * Based on Next.js documentation recommendations
   */
  getRelevantEnvFiles(): string[] {
    const relevantFiles: string[] = [];
    
    // Always include base .env if it exists
    if (fs.existsSync(path.join(this.rootPath, '.env'))) {
      relevantFiles.push('.env');
    }

    // Include environment-specific files
    const envFile = `.env.${this.nodeEnv}`;
    if (fs.existsSync(path.join(this.rootPath, envFile))) {
      relevantFiles.push(envFile);
    }

    // Include .env.example if it exists (common pattern)
    if (fs.existsSync(path.join(this.rootPath, '.env.example'))) {
      relevantFiles.push('.env.example');
    }

    // Include .env.template if it exists
    if (fs.existsSync(path.join(this.rootPath, '.env.template'))) {
      relevantFiles.push('.env.template');
    }

    return relevantFiles;
  }

  /**
   * Check if project follows Next.js environment variable best practices
   */
  async checkBestPractices(): Promise<{
    hasExample: boolean;
    hasGitignore: boolean;
    hasPublicVarsInEnv: boolean;
    recommendations: string[];
  }> {
    const hasExample = fs.existsSync(path.join(this.rootPath, '.env.example'));
    const hasGitignore = this.checkGitignoreForEnvFiles();
    
    const analysis = await this.analyzeEnvironmentFiles();
    const hasPublicVarsInEnv = Object.keys(analysis.publicVariables).length > 0;

    const recommendations: string[] = [];

    if (!hasExample) {
      recommendations.push('Create .env.example file to document required environment variables');
    }

    if (!hasGitignore) {
      recommendations.push('Add .env*.local files to .gitignore to prevent committing secrets');
    }

    if (hasPublicVarsInEnv) {
      recommendations.push('Consider documenting NEXT_PUBLIC_ variables and their usage');
    }

    return {
      hasExample,
      hasGitignore,
      hasPublicVarsInEnv,
      recommendations
    };
  }

  private checkGitignoreForEnvFiles(): boolean {
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return false;
    }

    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      return gitignoreContent.includes('.env') || gitignoreContent.includes('*.env');
    } catch {
      return false;
    }
  }
} 