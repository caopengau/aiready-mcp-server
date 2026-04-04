import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve skills path: go up to src, then to package root, then to monorepo root, then into skills
// Actually, it's easier to use a relative path if they are in the same monorepo
const SKILLS_AGENTS_MD_PATH = path.resolve(
  __dirname,
  '../../skills/aiready-best-practices/AGENTS.md'
);

export const BestPracticesArgsSchema = z.object({
  category: z
    .string()
    .describe(
      'Category of best practices (e.g., patterns, context, consistency, signal, grounding)'
    ),
});

export const ComplianceArgsSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to check'),
});

export async function handleGetBestPractices(
  args: z.infer<typeof BestPracticesArgsSchema>
) {
  const { category } = args;

  try {
    const content = await fs.promises.readFile(SKILLS_AGENTS_MD_PATH, 'utf-8');

    // Simple parsing to extract the relevant section based on ## <Number>. <Category>
    // We'll search for the heading that starts with the number and contains the category name in parentheses
    // e.g., "## 1. Pattern Detection (patterns)"
    const lines = content.split('\n');
    let inSection = false;
    const sectionContent: string[] = [];

    for (const line of lines) {
      if (
        line.startsWith('## ') &&
        line.toLowerCase().includes(`(${category.toLowerCase()})`)
      ) {
        inSection = true;
        sectionContent.push(line);
        continue;
      }

      if (
        inSection &&
        line.startsWith('## ') &&
        !line.toLowerCase().includes(`(${category.toLowerCase()})`)
      ) {
        break; // Next main section
      }

      if (inSection) {
        sectionContent.push(line);
      }
    }

    if (sectionContent.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Category "${category}" not found in AIReady Best Practices.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: sectionContent.join('\n') }],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error reading best practices: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleCheckCompliance(
  args: z.infer<typeof ComplianceArgsSchema>
) {
  const { file_path } = args;

  try {
    const content = await fs.promises.readFile(file_path, 'utf-8');
    const issues: string[] = [];

    // Lightweight checks based on AGENTS.md rules

    // 1. File Length (>500 lines)
    const lineCount = content.split('\n').length;
    if (lineCount > 500) {
      issues.push(
        `⚠️ **Context Optimization (2.3)**: File has ${lineCount} lines. Large files waste context. Consider splitting into smaller modules.`
      );
    }

    // 2. Boolean Trap Parameters
    if (
      content.includes('true, false') ||
      content.includes('false, true') ||
      content.includes('true, true')
    ) {
      issues.push(
        `🚩 **AI Signal Clarity (4.1)**: Detected potential positional boolean traps. Prefer named options objects for clarity.`
      );
    }

    // 3. Magic Literals
    const magicNumberRegex = /[^A-Z_a-z][0-9]{2,}[^A-Z_a-z0-9]/g;
    if (magicNumberRegex.test(content)) {
      issues.push(
        `🚩 **AI Signal Clarity (4.3)**: Detected potential magic literals (raw numbers). Use named constants/enums for business rules.`
      );
    }

    // 4. Entropy
    const entropyRegex = /\b(data|info|handle|obj|item)\b/gi;
    const matches = content.match(entropyRegex);
    if (matches && matches.length > 5) {
      issues.push(
        `🚩 **AI Signal Clarity (4.2)**: High-entropy names detected (${[...new Set(matches.map((m) => m.toLowerCase()))].join(', ')}). Use specific domain names instead.`
      );
    }

    if (issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ File "${path.basename(file_path)}" is compliant with lightweight AIReady Best Practices.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `AIReady Compliance Report for "${path.basename(file_path)}":\n\n${issues.join('\n')}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        { type: 'text', text: `Error checking compliance: ${error.message}` },
      ],
      isError: true,
    };
  }
}
