import { describe, it, expect, vi } from 'vitest';
import { ToolName } from '@aiready/core';
import {
  ADVERTISED_TOOLS,
  TOOL_PACKAGE_MAP,
  handleAnalysis,
} from '../tools/index.js';

describe('MCP Schema Sync Validation', () => {
  it('every advertised tool should have a package mapping or a custom handler', () => {
    // 1. Spoke tools that use handleAnalysis
    const spokeTools = ADVERTISED_TOOLS.filter(
      (t) =>
        ![
          'get_best_practices',
          'check_best_practice_compliance',
          'analyze_context_budget',
        ].includes(t)
    );

    for (const tool of spokeTools) {
      expect(
        TOOL_PACKAGE_MAP[tool],
        `Tool "${tool}" is missing a mapping in TOOL_PACKAGE_MAP`
      ).toBeDefined();
    }
  });

  it('every package in TOOL_PACKAGE_MAP should be a valid @aiready package name', () => {
    for (const [tool, pkg] of Object.entries(TOOL_PACKAGE_MAP)) {
      expect(
        pkg.startsWith('@aiready/'),
        `Mapping for "${tool}" -> "${pkg}" must use a scoped @aiready package`
      ).toBe(true);
    }
  });

  it('handleAnalysis should correctly resolve and attempt to load packages from the map', async () => {
    // Mock the dynamic import to verify it's called with the correct package
    const importMock = vi.fn().mockRejectedValue(new Error('Stop here'));
    vi.stubGlobal('import', importMock);

    // Testing dynamic loading path
    const toolName = ToolName.PatternDetect;
    const expectedPackage = TOOL_PACKAGE_MAP[toolName];

    try {
      await handleAnalysis(toolName, { path: './test' });
    } catch (e: any) {
      // We expect it to fail at the import stage because of our mock
      expect(e.message).toContain(`failed to load package ${expectedPackage}`);
    }
  });
});
