import { analyzePatterns } from '@aiready/pattern-detect';
import { analyzeContext } from '@aiready/context-analyzer';
import { analyzeConsistency } from '@aiready/consistency';
import type { AnalysisResult, ScanOptions, SpokeOutput } from '@aiready/core';
import {
  calculateOverallScore,
  type ToolScoringOutput,
  type ScoringResult,
  calculateTokenBudget,
  ToolName,
} from '@aiready/core';
export type { ToolScoringOutput, ScoringResult };

export interface UnifiedAnalysisOptions extends ScanOptions {
  tools?: (
    | 'patterns'
    | 'context'
    | 'consistency'
    | 'doc-drift'
    | 'deps-health'
    | 'ai-signal-clarity'
    | 'agent-grounding'
    | 'testability'
    | 'change-amplification'
  )[];
  minSimilarity?: number;
  minLines?: number;
  maxCandidatesPerBlock?: number;
  minSharedTokens?: number;
  useSmartDefaults?: boolean;
  consistency?: any;
  progressCallback?: (event: { tool: string; data: any }) => void;
}

export interface UnifiedAnalysisResult {
  // Canonical keys matching ToolName enum members
  [ToolName.PatternDetect]?: SpokeOutput & { duplicates: any[] };
  [ToolName.ContextAnalyzer]?: SpokeOutput;
  [ToolName.NamingConsistency]?: SpokeOutput;
  [ToolName.DocDrift]?: SpokeOutput;
  [ToolName.DependencyHealth]?: SpokeOutput;
  [ToolName.AiSignalClarity]?: any;
  [ToolName.AgentGrounding]?: any;
  [ToolName.TestabilityIndex]?: any;
  [ToolName.ChangeAmplification]?: SpokeOutput;

  // Legacy/Internal metadata
  summary: {
    totalIssues: number;
    toolsRun: string[];
    executionTime: number;
  };
  scoring?: ScoringResult;
  // Compatibility fallbacks (deprecated)
  /** @deprecated use [ToolName.PatternDetect] */
  patternDetect?: any;
  /** @deprecated use [ToolName.ContextAnalyzer] */
  contextAnalyzer?: any;
}

// Severity ordering (higher number = more severe)
const severityOrder: Record<string, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  info: 1,
};

function sortBySeverity(results: AnalysisResult[]): AnalysisResult[] {
  return results
    .map((file) => {
      // Sort issues within each file by severity (most severe first)
      const sortedIssues = [...file.issues].sort((a, b) => {
        const severityDiff =
          (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        // If same severity, sort by line number
        return (a.location?.line || 0) - (b.location?.line || 0);
      });
      return { ...file, issues: sortedIssues };
    })
    .sort((a, b) => {
      // Sort files by most severe issue first
      const aMaxSeverity = Math.max(
        ...a.issues.map((i) => severityOrder[i.severity] || 0),
        0
      );
      const bMaxSeverity = Math.max(
        ...b.issues.map((i) => severityOrder[i.severity] || 0),
        0
      );
      if (aMaxSeverity !== bMaxSeverity) {
        return bMaxSeverity - aMaxSeverity;
      }
      // If same max severity, sort by number of issues
      if (a.issues.length !== b.issues.length) {
        return b.issues.length - a.issues.length;
      }
      // Finally, sort alphabetically by filename
      return a.fileName.localeCompare(b.fileName);
    });
}

export async function analyzeUnified(
  options: UnifiedAnalysisOptions
): Promise<UnifiedAnalysisResult> {
  const startTime = Date.now();
  const tools = options.tools || ['patterns', 'context', 'consistency'];
  // Tools requested and effective options are used from `options`
  const result: UnifiedAnalysisResult = {
    summary: {
      totalIssues: 0,
      toolsRun: tools,
      executionTime: 0,
    },
  };

  // Run pattern detection
  if (tools.includes('patterns')) {
    const patternResult = await analyzePatterns(options);
    if (options.progressCallback) {
      options.progressCallback({ tool: 'patterns', data: patternResult });
    }
    const output = {
      results: sortBySeverity(patternResult.results),
      summary: patternResult.summary || {},
      duplicates: patternResult.duplicates || [],
    };
    result[ToolName.PatternDetect] = output;
    result.patternDetect = output; // Compatibility fallback

    result.summary.totalIssues += patternResult.results.reduce(
      (sum, file) => sum + file.issues.length,
      0
    );
  }

  // Run context analysis
  if (tools.includes('context')) {
    const contextResults = await analyzeContext(options);
    if (options.progressCallback) {
      options.progressCallback({ tool: 'context', data: contextResults });
    }
    const sorted = contextResults.sort((a, b) => {
      const severityDiff =
        (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      if (a.tokenCost !== b.tokenCost) return b.tokenCost - a.tokenCost;
      return b.fragmentationScore - a.fragmentationScore;
    });

    const { generateSummary: genContextSummary } =
      await import('@aiready/context-analyzer');
    const output = {
      results: sorted,
      summary: genContextSummary(sorted),
    };
    result[ToolName.ContextAnalyzer] = output;
    result.contextAnalyzer = output; // Compatibility fallback

    result.summary.totalIssues += sorted.length;
  }

  // Run consistency analysis
  if (tools.includes('consistency')) {
    const consistencyOptions = {
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      ...(options.consistency || {}),
    };
    const report = await analyzeConsistency(consistencyOptions);
    if (options.progressCallback) {
      options.progressCallback({ tool: 'consistency', data: report });
    }
    result[ToolName.NamingConsistency] = {
      results: report.results ? sortBySeverity(report.results) : [],
      summary: report.summary,
    };
    result.summary.totalIssues += report.summary.totalIssues;
  }

  // Run Documentation Drift analysis
  if (tools.includes('doc-drift')) {
    const { analyzeDocDrift } = await import('@aiready/doc-drift');
    const report = await analyzeDocDrift({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'doc-drift', data: report });
    }
    result[ToolName.DocDrift] = {
      results: (report as any).results || (report as any).issues || [],
      summary: report.summary || {},
    };
    const issueCount =
      (report as any).issues?.length ||
      ((report as any).results ? (report as any).results.length : 0);
    result.summary.totalIssues += issueCount;
  }

  // Run Dependency Health analysis
  if (tools.includes('deps-health')) {
    const { analyzeDeps } = await import('@aiready/deps');
    const report = await analyzeDeps({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'deps-health', data: report });
    }
    result[ToolName.DependencyHealth] = {
      results: (report as any).results || (report as any).issues || [],
      summary: report.summary || {},
    };
    const issueCount =
      (report as any).issues?.length ||
      ((report as any).results ? (report as any).results.length : 0);
    result.summary.totalIssues += issueCount;
  }

  // Run AI Signal Clarity analysis
  if (tools.includes('ai-signal-clarity')) {
    const { analyzeAiSignalClarity } =
      await import('@aiready/ai-signal-clarity');
    const report = await analyzeAiSignalClarity({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'ai-signal-clarity', data: report });
    }
    result[ToolName.AiSignalClarity] = {
      ...report,
      results: report.results || report.issues || [],
      summary: report.summary || {},
    };
    result.summary.totalIssues +=
      (report.results || report.issues)?.reduce(
        (sum: number, r: any) => sum + (r.issues?.length || 1),
        0
      ) || 0;
  }

  // Run Agent Grounding analysis
  if (tools.includes('agent-grounding')) {
    const { analyzeAgentGrounding } = await import('@aiready/agent-grounding');
    const report = await analyzeAgentGrounding({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'agent-grounding', data: report });
    }
    result[ToolName.AgentGrounding] = {
      ...(report as any),
      results: (report as any).results || (report as any).issues || [],
      summary: report.summary || {},
    };
    result.summary.totalIssues += (
      (report as any).issues ||
      (report as any).results ||
      []
    ).length;
  }

  // Run Testability analysis
  if (tools.includes('testability')) {
    const { analyzeTestability } = await import('@aiready/testability');
    const report = await analyzeTestability({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'testability', data: report });
    }
    result[ToolName.TestabilityIndex] = {
      ...(report as any),
      results: (report as any).results || (report as any).issues || [],
      summary: report.summary || {},
    };
    result.summary.totalIssues += (
      (report as any).issues ||
      (report as any).results ||
      []
    ).length;
  }

  // Run Change Amplification analysis
  if (tools.includes('change-amplification')) {
    const { analyzeChangeAmplification } =
      await import('@aiready/change-amplification');
    const report = await analyzeChangeAmplification({
      rootDir: options.rootDir,
      include: options.include,
      exclude: options.exclude,
      onProgress: options.onProgress,
    });
    if (options.progressCallback) {
      options.progressCallback({ tool: 'change-amplification', data: report });
    }
    result[ToolName.ChangeAmplification] = {
      results: report.results || [],
      summary: report.summary || {},
    };
    result.summary.totalIssues += report.summary?.totalIssues || 0;
  }

  result.summary.executionTime = Date.now() - startTime;
  return result;
}

export async function scoreUnified(
  results: UnifiedAnalysisResult,
  options: UnifiedAnalysisOptions
): Promise<ScoringResult> {
  const toolScores: Map<string, ToolScoringOutput> = new Map();

  // Patterns score
  if (results[ToolName.PatternDetect]) {
    const data = results[ToolName.PatternDetect];
    const { calculatePatternScore } = await import('@aiready/pattern-detect');
    try {
      const patternScore = calculatePatternScore(
        data.duplicates,
        data.results?.length || 0
      );

      // Calculate token budget for patterns (waste = duplication)
      const wastedTokens = data.duplicates.reduce(
        (sum: number, d: any) => sum + (d.tokenCost || 0),
        0
      );
      patternScore.tokenBudget = calculateTokenBudget({
        totalContextTokens: wastedTokens * 2, // Estimated context
        wastedTokens: {
          duplication: wastedTokens,
          fragmentation: 0,
          chattiness: 0,
        },
      });

      toolScores.set(ToolName.PatternDetect, patternScore);
    } catch (err) {
      void err;
    }
  }

  // Context score
  if (results[ToolName.ContextAnalyzer]) {
    const data = results[ToolName.ContextAnalyzer];
    const { calculateContextScore } = await import('@aiready/context-analyzer');
    try {
      const ctxSummary = data.summary;
      const contextScore = calculateContextScore(ctxSummary);

      // Calculate token budget for context (waste = fragmentation + depth overhead)
      contextScore.tokenBudget = calculateTokenBudget({
        totalContextTokens: ctxSummary.totalTokens,
        wastedTokens: {
          duplication: 0,
          fragmentation: ctxSummary.totalPotentialSavings || 0,
          chattiness: 0,
        },
      });

      toolScores.set(ToolName.ContextAnalyzer, contextScore);
    } catch (err) {
      void err;
    }
  }

  // Consistency score
  if (results[ToolName.NamingConsistency]) {
    const data = results[ToolName.NamingConsistency];
    const { calculateConsistencyScore } = await import('@aiready/consistency');
    try {
      const issues = data.results?.flatMap((r: any) => r.issues) || [];
      const totalFiles = data.summary?.filesAnalyzed || 0;
      const consistencyScore = calculateConsistencyScore(issues, totalFiles);
      toolScores.set(ToolName.NamingConsistency, consistencyScore);
    } catch (err) {
      void err;
    }
  }

  // AI signal clarity score
  if (results[ToolName.AiSignalClarity]) {
    const { calculateAiSignalClarityScore } =
      await import('@aiready/ai-signal-clarity');
    try {
      const hrScore = calculateAiSignalClarityScore(
        results[ToolName.AiSignalClarity]
      );
      toolScores.set(ToolName.AiSignalClarity, hrScore);
    } catch (err) {
      void err;
    }
  }

  // Agent grounding score
  if (results[ToolName.AgentGrounding]) {
    const { calculateGroundingScore } =
      await import('@aiready/agent-grounding');
    try {
      const agScore = calculateGroundingScore(results[ToolName.AgentGrounding]);
      toolScores.set(ToolName.AgentGrounding, agScore);
    } catch (err) {
      void err;
    }
  }

  // Testability score
  if (results[ToolName.TestabilityIndex]) {
    const { calculateTestabilityScore } = await import('@aiready/testability');
    try {
      const tbScore = calculateTestabilityScore(
        results[ToolName.TestabilityIndex]
      );
      toolScores.set(ToolName.TestabilityIndex, tbScore);
    } catch (err) {
      void err;
    }
  }

  // Documentation Drift score
  if (results[ToolName.DocDrift]) {
    const data = results[ToolName.DocDrift];
    toolScores.set(ToolName.DocDrift, {
      toolName: ToolName.DocDrift,
      score: data.summary.score || data.summary.totalScore || 0,
      rawMetrics: data.summary,
      factors: [],
      recommendations: (data.summary.recommendations || []).map(
        (action: string) => ({
          action,
          estimatedImpact: 5,
          priority: 'medium',
        })
      ),
    });
  }

  // Dependency Health score
  if (results[ToolName.DependencyHealth]) {
    const data = results[ToolName.DependencyHealth];
    toolScores.set(ToolName.DependencyHealth, {
      toolName: ToolName.DependencyHealth,
      score: data.summary.score || 0,
      rawMetrics: data.summary,
      factors: [],
      recommendations: (data.summary.recommendations || []).map(
        (action: string) => ({
          action,
          estimatedImpact: 5,
          priority: 'medium',
        })
      ),
    });
  }

  // Change Amplification score
  if (results[ToolName.ChangeAmplification]) {
    const data = results[ToolName.ChangeAmplification];
    toolScores.set(ToolName.ChangeAmplification, {
      toolName: ToolName.ChangeAmplification,
      score: data.summary.score || 0,
      rawMetrics: data.summary,
      factors: [],
      recommendations: (data.summary.recommendations || []).map(
        (action: string) => ({
          action,
          estimatedImpact: 5,
          priority: 'medium',
        })
      ),
    });
  }

  // Handle case where toolScores is empty
  if (toolScores.size === 0) {
    return {
      overall: 0,
      rating: 'Critical',
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      breakdown: [],
      calculation: {
        formula: '0 / 0 = 0',
        weights: {},
        normalized: '0 / 0 = 0',
      },
    } as ScoringResult;
  }

  return calculateOverallScore(toolScores, options, undefined);
}

export function generateUnifiedSummary(result: UnifiedAnalysisResult): string {
  const { summary } = result;
  let output = `🚀 AIReady Analysis Complete\n\n`;
  output += `📊 Summary:\n`;
  output += `   Tools run: ${summary.toolsRun.join(', ')}\n`;
  output += `   Total issues found: ${summary.totalIssues}\n`;
  output += `   Execution time: ${(summary.executionTime / 1000).toFixed(2)}s\n\n`;

  if (result[ToolName.PatternDetect]) {
    output += `🔍 Pattern Analysis: ${result[ToolName.PatternDetect].results.length} issues\n`;
  }

  if (result[ToolName.ContextAnalyzer]) {
    output += `🧠 Context Analysis: ${result[ToolName.ContextAnalyzer].results.length} issues\n`;
  }

  if (result[ToolName.NamingConsistency]) {
    output += `🏷️ Consistency Analysis: ${result[ToolName.NamingConsistency].summary.totalIssues} issues\n`;
  }

  if (result[ToolName.DocDrift]) {
    output += `📝 Doc Drift Analysis: ${result[ToolName.DocDrift].results?.length || 0} issues\n`;
  }

  if (result[ToolName.DependencyHealth]) {
    output += `📦 Dependency Health: ${result[ToolName.DependencyHealth].results?.length || 0} issues\n`;
  }

  if (result[ToolName.AiSignalClarity]) {
    output += `🧠 AI Signal Clarity: ${result[ToolName.AiSignalClarity].summary?.totalSignals || 0} signals\n`;
  }

  if (result[ToolName.AgentGrounding]) {
    output += `🧭 Agent Grounding: ${result[ToolName.AgentGrounding].results?.length || 0} issues\n`;
  }

  if (result[ToolName.TestabilityIndex]) {
    output += `🧪 Testability Index: ${result[ToolName.TestabilityIndex].results?.length || 0} issues\n`;
  }

  if (result[ToolName.ChangeAmplification]) {
    output += `💥 Change Amplification: ${result[ToolName.ChangeAmplification].summary?.totalIssues || 0} cascading risks\n`;
  }

  return output;
}
