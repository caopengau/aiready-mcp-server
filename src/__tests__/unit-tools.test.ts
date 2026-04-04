import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import {
  handleGetBestPractices,
  handleCheckCompliance,
} from '../tools/best-practices';
import { handleAnalyzeContextBudget } from '../tools/context-budget';
import path from 'path';

vi.mock('fs', async () => {
  const actual: any = await vi.importActual('fs');
  return {
    ...actual,
    default: {
      ...actual.default,
      promises: {
        readFile: vi.fn(),
      },
    },
  };
});

describe('MCP Tools Unit Tests', () => {
  describe('handleGetBestPractices', () => {
    it('should return correct section from AGENTS.md', async () => {
      const mockMarkdown = `
# Best Practices
## 1. Pattern Detection (patterns)
This is the pattern detection section.
## 2. Context Optimization (context)
This is the context section.
`;
      (fs.promises.readFile as any).mockResolvedValue(mockMarkdown);

      const result = await handleGetBestPractices({ category: 'patterns' });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        'This is the pattern detection section.'
      );
      expect(result.content[0].text).not.toContain(
        'This is the context section.'
      );
    });

    it('should return error if category is not found', async () => {
      (fs.promises.readFile as any).mockResolvedValue(
        '## 1. Pattern (patterns)'
      );
      const result = await handleGetBestPractices({ category: 'non-existent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Category "non-existent" not found'
      );
    });

    it('should handle file read error', async () => {
      (fs.promises.readFile as any).mockRejectedValue(
        new Error('File not found')
      );
      const result = await handleGetBestPractices({ category: 'patterns' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error reading best practices: File not found'
      );
    });
  });

  describe('handleCheckCompliance', () => {
    it('should report issues for a non-compliant file', async () => {
      const mockContent = `
// This is a large file with issues
${'\n'.repeat(501)}
function trap() {
  foo(true, false);
}
const magic = 999;
const data = {};
const info = {};
const handle = {};
const obj = {};
const item = {};
const item extra = {};
const item again = {};
const item five = {};
const item six = {};
`;
      (fs.promises.readFile as any).mockResolvedValue(mockContent);

      const result = await handleCheckCompliance({
        file_path: '/dummy/path.ts',
      });
      expect(result.isError).toBeUndefined();
      const report = result.content[0].text;
      expect(report).toContain('Context Optimization');
      expect(report).toContain('AI Signal Clarity (4.1)'); // Boolean trap
      expect(report).toContain('AI Signal Clarity (4.3)'); // Magic literals
      expect(report).toContain('AI Signal Clarity (4.2)'); // High entropy
    });

    it('should return success for compliant file', async () => {
      const mockContent = `const VALID = 1;`;
      (fs.promises.readFile as any).mockResolvedValue(mockContent);

      const result = await handleCheckCompliance({ file_path: 'ok.ts' });
      expect(result.content[0].text).toContain('is compliant');
    });
  });

  describe('handleAnalyzeContextBudget', () => {
    it('should estimate tokens and provide recommendations', async () => {
      const mockContent = `
import fs from 'fs';
import path from 'path';
${'import somepackage from "pkg";\n'.repeat(25)}
// content
${'a'.repeat(25000)}
`;
      (fs.promises.readFile as any).mockResolvedValue(mockContent);

      const result = await handleAnalyzeContextBudget({
        file_path: 'large.ts',
      });
      expect(result.isError).toBeUndefined();
      const report = result.content[0].text;
      expect(report).toContain('Estimated Tokens:');
      expect(report).toContain('Context Usage By Tier');
      expect(report).toContain('High Context Usage');
      expect(report).toContain('High Dependency Load');
    });

    it('should handle small files with optimal results', async () => {
      (fs.promises.readFile as any).mockResolvedValue('short content');
      const result = await handleAnalyzeContextBudget({
        file_path: 'small.ts',
      });
      expect(result.content[0].text).toContain('Optimal Size');
    });
  });
});
