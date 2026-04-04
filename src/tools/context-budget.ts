import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export const ContextBudgetArgsSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to analyze'),
});

export interface TokenEstimation {
  tokens: number;
  budgetPercentage: number;
  tier: string;
}

export async function handleAnalyzeContextBudget(
  args: z.infer<typeof ContextBudgetArgsSchema>
) {
  const { file_path } = args;

  try {
    const content = await fs.promises.readFile(file_path, 'utf-8');

    // Token estimation (approx 4 chars/token)
    const charCount = content.length;
    const tokens = Math.ceil(charCount / 4);

    // Tiers according to common context windows
    const tiers = [
      { name: '8k (GPT-4/Turbo)', threshold: 8000 },
      { name: '32k (GPT-4o/Mini)', threshold: 32000 },
      { name: '128k (GPT-4o/Claude 3)', threshold: 128000 },
      { name: '200k (Claude 3.5 Sonnet)', threshold: 200000 },
      { name: '1M (Gemini 1.5 Pro)', threshold: 1000000 },
    ];

    let result = `# Context Budget for "${path.basename(file_path)}"\n\n`;
    result += `**Estimated Tokens:** ${tokens.toLocaleString()}\n\n`;

    result += `### Context Usage By Tier\n`;
    tiers.forEach((tier) => {
      const percentage = (tokens / tier.threshold) * 100;
      const barLength = Math.min(Math.ceil(percentage / 5), 20);
      const bar =
        '█'.repeat(barLength) + '░'.repeat(Math.max(0, 20 - barLength));
      result += ` - **${tier.name}:** ${bar} ${percentage.toFixed(1)}%\n`;
    });

    result += `\n### Recommendations\n`;

    if (tokens > 5000) {
      result += `⚠️ **High Context Usage:** This file alone takes up a significant chunk of smaller context windows. Consider refactoring to extract logical sub-modules.\n`;
    } else {
      result += `✅ **Optimal Size:** This file is well-sized for AI context windows.\n`;
    }

    // Check for large imports
    const importCount = (content.match(/^import /gm) || []).length;
    if (importCount > 20) {
      result += `⚠️ **High Dependency Load:** ${importCount} imports found. AI will need to load many dependent files, multiplying the context budget needed. Use barrel exports (index.ts) to flatten the dependency tree.\n`;
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing context budget: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
