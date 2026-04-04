import { z } from 'zod';
import { ToolRegistry, ToolName } from '@aiready/core';
import {
  handleGetBestPractices,
  handleCheckCompliance,
  BestPracticesArgsSchema,
  ComplianceArgsSchema,
} from './best-practices.js';
import {
  handleAnalyzeContextBudget,
  ContextBudgetArgsSchema,
} from './context-budget.js';

/**
 * Zod schemas for tool arguments
 */
export const AnalysisArgsSchema = z.object({
  path: z.string().describe('Path to the directory to analyze'),
  summary_only: z
    .boolean()
    .optional()
    .describe(
      'If true, returns only the summary and skips the detailed issue list. Best for large projects to save context.'
    ),
});

export const RemediationArgsSchema = z.object({
  issue_id: z.string().describe('The unique ID of the issue to fix'),
  file_path: z.string().describe('The path to the file containing the issue'),
  context: z.string().describe('The content of the file or surrounding code'),
});

export {
  BestPracticesArgsSchema,
  ComplianceArgsSchema,
  ContextBudgetArgsSchema,
};

/**
 * Mapping between tool names and @aiready/ package names.
 * Used for dynamic registration on-demand to minimize initial context budget.
 */
export const TOOL_PACKAGE_MAP: Record<string, string> = {
  [ToolName.PatternDetect]: '@aiready/pattern-detect',
  [ToolName.ContextAnalyzer]: '@aiready/context-analyzer',
  [ToolName.NamingConsistency]: '@aiready/consistency',
  [ToolName.AiSignalClarity]: '@aiready/ai-signal-clarity',
  [ToolName.AgentGrounding]: '@aiready/agent-grounding',
  [ToolName.TestabilityIndex]: '@aiready/testability',
  [ToolName.DocDrift]: '@aiready/doc-drift',
  [ToolName.DependencyHealth]: '@aiready/deps',
  [ToolName.ChangeAmplification]: '@aiready/change-amplification',
  [ToolName.ContractEnforcement]: '@aiready/contract-enforcement',
  // New tools from core
  [ToolName.CognitiveLoad]: '@aiready/cognitive-load',
  [ToolName.PatternEntropy]: '@aiready/pattern-entropy',
  [ToolName.ConceptCohesion]: '@aiready/concept-cohesion',
  [ToolName.SemanticDistance]: '@aiready/semantic-distance',
  // Aliases
  patterns: '@aiready/pattern-detect',
  duplicates: '@aiready/pattern-detect',
  context: '@aiready/context-analyzer',
  fragmentation: '@aiready/context-analyzer',
  consistency: '@aiready/consistency',
  'ai-signal': '@aiready/ai-signal-clarity',
  grounding: '@aiready/agent-grounding',
  testability: '@aiready/testability',
  'deps-health': '@aiready/deps',
  'change-amp': '@aiready/change-amplification',
  'contract-enforce': '@aiready/contract-enforcement',
};

/**
 * List of tools to advertise to the client
 */
export const ADVERTISED_TOOLS = [
  ToolName.PatternDetect,
  ToolName.ContextAnalyzer,
  ToolName.NamingConsistency,
  ToolName.AiSignalClarity,
  ToolName.AgentGrounding,
  ToolName.TestabilityIndex,
  ToolName.DocDrift,
  ToolName.DependencyHealth,
  ToolName.ChangeAmplification,
  ToolName.ContractEnforcement,
  ToolName.CognitiveLoad,
  ToolName.PatternEntropy,
  ToolName.ConceptCohesion,
  ToolName.SemanticDistance,
  'get_best_practices',
  'check_best_practice_compliance',
  'analyze_context_budget',
];

export {
  handleGetBestPractices,
  handleCheckCompliance,
  handleAnalyzeContextBudget,
};

export async function handleAnalysis(
  name: string,
  args: any,
  stateStore?: any
) {
  const parsedArgs = AnalysisArgsSchema.safeParse(args);
  if (!parsedArgs.success) {
    throw new Error(
      `Invalid arguments for ${name}: ${parsedArgs.error.message}`
    );
  }
  const { path: rootDir, summary_only } = parsedArgs.data;

  let provider = ToolRegistry.find(name);

  // Dynamic loading if not already registered
  if (!provider) {
    const packageName =
      TOOL_PACKAGE_MAP[name] ??
      (name.startsWith('@aiready/') ? name : `@aiready/${name}`);

    try {
      console.error(
        `[MCP] Dynamically loading ${packageName} for tool ${name}`
      );
      await import(packageName);
      provider = ToolRegistry.find(name);
    } catch (importError: unknown) {
      const importErrorMessage =
        importError instanceof Error
          ? importError.message
          : String(importError);
      throw new Error(
        `Tool ${name} not found and failed to load package ${packageName}: ${importErrorMessage}`
      );
    }
  }

  if (!provider) {
    throw new Error(`Tool ${name} not found after attempting to load`);
  }

  console.error(
    `[MCP] Executing ${name} on ${rootDir}${summary_only ? ' (summary only)' : ''}`
  );

  const results = await provider.analyze({
    rootDir,
  });

  // Update state store if provided
  if (stateStore) {
    stateStore.updateLastResults(results);
  }

  // Format results for the agent
  if (summary_only) {
    const summary = results.summary;
    return {
      summary: `## Issue Breakdown
- Critical: ${summary.criticalIssues}
- Major: ${summary.majorIssues}
- Total Issues: ${summary.totalIssues}
- Files Analyzed: ${summary.totalFiles}`,
      metadata: results.metadata,
      notice:
        'Detailed issues were omitted (summary_only: true). Run without summary_only for full details.',
    };
  }

  return results;
}

export async function handleRemediation(
  args: z.infer<typeof RemediationArgsSchema>
) {
  const apiKey = process.env.AIREADY_API_KEY;
  const serverUrl =
    process.env.AIREADY_PLATFORM_URL || 'https://platform.getaiready.dev';

  if (!apiKey) {
    throw new Error(
      'AIREADY_API_KEY is not set. Remediation requires an active subscription.'
    );
  }

  console.error(`[MCP] Requesting remediation for ${args.issue_id}...`);

  try {
    const response = await fetch(`${serverUrl}/api/v1/remediate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        issueId: args.issue_id,
        filePath: args.file_path,
        context: args.context,
        agent: 'mcp-server',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Platform Error: ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: `Recommended Fix (Diff):\n\n${data.diff}\n\nRationale:\n${data.rationale}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get remediation: ${errorMessage}. Please visit the dashboard to fix manually.`,
        },
      ],
      isError: true,
    };
  }
}
