import { FileInfo, ContextStats, GenerationOptions } from '../../core/types';
import { SharedUtilities } from '../../utils/SharedUtilities';

export interface FormattedSection {
  title: string;
  content: string;
  priority: number;
}

export interface ContextFormatOptions {
  includeLineNumbers?: boolean;
  addSectionAnchors?: boolean;
  useMarkdownTables?: boolean;
  compactFormat?: boolean;
}

export class ContextFormatter {
  private static readonly MAX_SECTION_SIZE = 50000; // 50KB per section

  static formatForXML(
    sections: FormattedSection[],
    stats: ContextStats,
    options: ContextFormatOptions = {}
  ): string {
    const timestamp = new Date().toISOString();
    
    let output = `<?xml version="1.0" encoding="UTF-8"?>
<nextjs-context generated="${timestamp}">
  <metadata>
    <total-files>${stats.totalFiles}</total-files>
    <total-size>${stats.totalSize}</total-size>
    <total-tokens>${stats.totalTokens}</total-tokens>
    <nextjs-version>${stats.versions?.nextjs || 'unknown'}</nextjs-version>
  </metadata>
  
  <project-structure>
    <type>${stats.projectDetection?.structureType || 'unknown'}</type>
    <confidence>${stats.projectDetection?.confidence || 0}</confidence>
  </project-structure>
  
  <content>
`;

    for (const section of sections.sort((a, b) => b.priority - a.priority)) {
      const sectionContent = this.truncateIfNeeded(section.content, this.MAX_SECTION_SIZE);
      output += `    <section name="${this.escapeXML(section.title)}">
      <![CDATA[${sectionContent}]]>
    </section>
`;
    }

    output += `  </content>
</nextjs-context>`;

    return output;
  }

  static formatForMarkdown(
    sections: FormattedSection[],
    stats: ContextStats,
    options: ContextFormatOptions = {}
  ): string {
    const timestamp = new Date().toISOString();
    
    let output = `# Next.js Project Context

*Generated: ${timestamp}*

## 📊 Project Overview

| Metric | Value |
|--------|--------|
| Total Files | ${stats.totalFiles} |
| Total Size | ${SharedUtilities.formatBytes(stats.totalSize)} |
| Total Tokens | ${stats.totalTokens.toLocaleString()} |
| Next.js Version | ${stats.versions?.nextjs || 'unknown'} |
| Structure Type | ${stats.projectDetection?.structureType || 'unknown'} |
| Detection Confidence | ${stats.projectDetection?.confidence || 0}% |
 
`;

    if (stats.projectDetection?.detectedLibraries) {
      output += this.formatDetectedLibraries(stats.projectDetection.detectedLibraries);
    }

    output += '\n## 📁 Project Content\n\n';

    for (const section of sections.sort((a, b) => b.priority - a.priority)) {
      const anchor = options.addSectionAnchors ? 
        `{#${section.title.toLowerCase().replace(/\s+/g, '-')}}` : '';
      
      output += `### ${section.title} ${anchor}\n\n`;
      
      const sectionContent = this.truncateIfNeeded(section.content, this.MAX_SECTION_SIZE);
      output += sectionContent + '\n\n';
    }

    return output;
  }

  static formatForJSON(
    sections: FormattedSection[],
    stats: ContextStats,
    options: ContextFormatOptions = {}
  ): string {
    const data = {
      metadata: {
        generated: new Date().toISOString(),
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        totalTokens: stats.totalTokens,
        nextjsVersion: stats.versions?.nextjs || 'unknown',
        projectStructure: {
          type: stats.projectDetection?.structureType || 'unknown',
          confidence: stats.projectDetection?.confidence || 0,
          detectedLibraries: stats.projectDetection?.detectedLibraries || {}
        }
      },
      sections: sections
        .sort((a, b) => b.priority - a.priority)
        .map(section => ({
          title: section.title,
          content: this.truncateIfNeeded(section.content, this.MAX_SECTION_SIZE),
          priority: section.priority
        }))
    };

    return JSON.stringify(data, null, options.compactFormat ? 0 : 2);
  }

  static formatFile(file: FileInfo, index: number, options: ContextFormatOptions = {}): string {
    const lineNumbers = options.includeLineNumbers;
    const maxLines = 1000; // Prevent extremely long files
    
    let content = file.content;
    const lines = content.split('\n');
    
    if (lines.length > maxLines) {
      content = lines.slice(0, maxLines).join('\n') + 
        `\n\n... (truncated: ${lines.length - maxLines} more lines)`;
    }

    if (lineNumbers) {
      content = this.addLineNumbers(content);
    }

    return `**File ${index + 1}: \`${file.path}\`**
*Size: ${SharedUtilities.formatBytes(file.size)} | Priority: ${file.priority} | Category: ${file.category}*

\`\`\`${SharedUtilities.getFileLanguage(file.path)}
${content}
\`\`\`
`;
  }

  private static addLineNumbers(content: string): string {
    return content
      .split('\n')
      .map((line, index) => `${(index + 1).toString().padStart(3, ' ')}: ${line}`)
      .join('\n');
  }

  // Removed redundant detectLanguage and formatBytes methods - now using SharedUtilities

  private static formatDetectedLibraries(libraries: any): string {
    const sections = [];
    
    if (libraries.ui && libraries.ui.length > 0) {
      sections.push(`**UI Libraries:** ${libraries.ui.join(', ')}`);
    }
    
    if (libraries.auth && libraries.auth.length > 0) {
      sections.push(`**Authentication:** ${libraries.auth.join(', ')}`);
    }
    
    if (libraries.database && libraries.database.length > 0) {
      sections.push(`**Database/ORM:** ${libraries.database.join(', ')}`);
    }
    
    if (libraries.state && libraries.state.length > 0) {
      sections.push(`**State Management:** ${libraries.state.join(', ')}`);
    }

    return sections.length > 0 ? 
      `## 🛠️ Detected Libraries\n\n${sections.join('\n')}\n` : '';
  }

  private static truncateIfNeeded(content: string, maxSize: number): string {
    if (content.length <= maxSize) return content;
    
    const truncated = content.substring(0, maxSize - 100);
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = lastNewline > maxSize * 0.8 ? lastNewline : truncated.length;
    
    return truncated.substring(0, cutPoint) + 
      `\n\n... (content truncated: ${content.length - cutPoint} more characters)`;
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
} 