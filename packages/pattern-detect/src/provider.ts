import {
  ToolProvider,
  ToolName,
  SpokeOutput,
  ScanOptions,
  ToolScoringOutput,
  SpokeOutputSchema,
  GLOBAL_SCAN_OPTIONS,
  Severity,
} from '@aiready/core';
import { analyzePatterns, PatternDetectOptions } from './analyzer';
import { calculatePatternScore } from './scoring';
import { filterBySeverity } from './context-rules';

/**
 * Pattern Detection Tool Provider
 */
export const PATTERN_DETECT_PROVIDER: ToolProvider = {
  id: ToolName.PatternDetect,
  alias: ['patterns', 'duplicates', 'duplication'],

  async analyze(options: ScanOptions): Promise<SpokeOutput> {
    const results = await analyzePatterns(options as PatternDetectOptions);

    // Normalize and validate to SpokeOutput format
    return SpokeOutputSchema.parse({
      results: results.results,
      summary: {
        totalFiles: results.files.length,
        totalIssues: results.results.reduce(
          (sum, r) => sum + r.issues.length,
          0
        ),
        duplicates: results.duplicates, // Keep the raw duplicates for score calculation
        clusters: results.clusters,
        config: Object.fromEntries(
          Object.entries(results.config).filter(
            ([key]) => !GLOBAL_SCAN_OPTIONS.includes(key) || key === 'rootDir'
          )
        ),
      },
      metadata: {
        toolName: ToolName.PatternDetect,
        version: '0.12.5',
        timestamp: new Date().toISOString(),
      },
    });
  },

  score(output: SpokeOutput, options: ScanOptions): ToolScoringOutput {
    const duplicates = output.summary.duplicates || [];
    const totalFiles = output.summary.totalFiles || output.results.length;

    // Filter duplicates by severity to match what the user sees
    // Smart defaults set severity: 'high' for repos with >3000 estimated blocks
    // This means only Critical and Major issues are shown, but scoring was done on ALL duplicates
    let scoreData = duplicates;
    const patternOptions = options as PatternDetectOptions;
    if (
      patternOptions.severity &&
      (patternOptions.severity as string) !== 'all'
    ) {
      const severityMap: Record<string, Severity> = {
        critical: Severity.Critical,
        high: Severity.Major, // 'high' maps to Major and above
        medium: Severity.Minor,
        all: Severity.Info,
      };
      const minSeverity = severityMap[patternOptions.severity] || Severity.Info;
      scoreData = filterBySeverity(duplicates, minSeverity);
    }

    return calculatePatternScore(scoreData, totalFiles, options.costConfig);
  },

  defaultWeight: 22,
};
