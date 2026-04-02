import { scanFiles } from '@aiready/core';
import type { ScanOptions } from '@aiready/core';

export interface PatternDetectOptions extends ScanOptions {
  minSimilarity?: number; // 0-1, default 0.40 (Jaccard similarity)
  minLines?: number; // Minimum lines to consider, default 5
  batchSize?: number; // Batch size for comparisons, default 100
  approx?: boolean; // Use approximate candidate selection (default true)
  minSharedTokens?: number; // Minimum shared tokens to consider a candidate, default 8
  maxCandidatesPerBlock?: number; // Cap candidates per block, default 100
  streamResults?: boolean; // Output duplicates incrementally as found (default false)
  useSmartDefaults?: boolean; // Use smart defaults based on repo size (default: true)
  groupByFilePair?: boolean; // Group duplicates by file pair to reduce noise (default: true)
  createClusters?: boolean; // Create refactor clusters for related patterns (default: true)
  minClusterTokenCost?: number; // Minimum token cost for cluster reporting (default: 1000)
  minClusterFiles?: number; // Minimum files for cluster reporting (default: 3)
  excludePatterns?: string[]; // Regex patterns to exclude specific code content
  confidenceThreshold?: number; // 0-1, minimum confidence score for reporting
  ignoreWhitelist?: string[]; // List of file pairs or patterns to ignore (false-positive whitelist)
  onProgress?: (processed: number, total: number, message: string) => void;
}

/**
 * Determine smart defaults based on repository size estimation.
 */
export async function getSmartDefaults(
  directory: string,
  userOptions: Partial<PatternDetectOptions>
): Promise<PatternDetectOptions> {
  if (userOptions.useSmartDefaults === false) {
    return {
      rootDir: directory,
      minSimilarity: 0.6,
      minLines: 8,
      batchSize: 100,
      approx: true,
      minSharedTokens: 12,
      maxCandidatesPerBlock: 5,
      streamResults: false,
      severity: 'all' as any,
      includeTests: false,
    };
  }

  const scanOptions = {
    rootDir: directory,
    include: userOptions.include || ['**/*.{ts,tsx,js,jsx,py,java}'],
    exclude: userOptions.exclude,
  };

  const files = await scanFiles(scanOptions);
  const fileCount = files.length;
  const estimatedBlocks = fileCount * 5;

  const minLines = Math.max(
    6,
    Math.min(20, 6 + Math.floor(estimatedBlocks / 1000) * 2)
  );

  const minSimilarity = Math.min(0.75, 0.45 + (estimatedBlocks / 10000) * 0.3);
  const batchSize = estimatedBlocks > 1000 ? 200 : 100;
  const severity = (estimatedBlocks > 3000 ? 'high' : 'all') as any;
  const maxCandidatesPerBlock = Math.max(
    5,
    Math.min(100, Math.floor(1000000 / estimatedBlocks))
  );

  const defaults: PatternDetectOptions = {
    rootDir: directory,
    minSimilarity,
    minLines,
    batchSize,
    approx: true,
    minSharedTokens: 10,
    maxCandidatesPerBlock,
    streamResults: false,
    severity,
    includeTests: false,
  };

  const result: PatternDetectOptions = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (
      key in userOptions &&
      userOptions[key as keyof PatternDetectOptions] !== undefined
    ) {
      (result as Record<string, unknown>)[key] =
        userOptions[key as keyof PatternDetectOptions];
    }
  }

  return result;
}

/**
 * Log current configuration settings to the console.
 */
export function logConfiguration(
  config: PatternDetectOptions,
  estimatedBlocks: number
): void {
  if ((config as { suppressToolConfig?: boolean }).suppressToolConfig) return;
  console.log('📋 Configuration:');
  console.log(`   Repository size: ~${estimatedBlocks} code blocks`);
  console.log(`   Similarity threshold: ${config.minSimilarity}`);
  console.log(`   Minimum lines: ${config.minLines}`);
  console.log(`   Approximate mode: ${config.approx ? 'enabled' : 'disabled'}`);
  console.log(`   Max candidates per block: ${config.maxCandidatesPerBlock}`);
  console.log(`   Min shared tokens: ${config.minSharedTokens}`);
  console.log(`   Severity filter: ${config.severity}`);
  console.log(`   Include tests: ${config.includeTests}`);

  if (config.excludePatterns && config.excludePatterns.length > 0) {
    console.log(`   Exclude patterns: ${config.excludePatterns.length} active`);
  }
  if (config.confidenceThreshold && config.confidenceThreshold > 0) {
    console.log(`   Confidence threshold: ${config.confidenceThreshold}`);
  }
  if (config.ignoreWhitelist && config.ignoreWhitelist.length > 0) {
    console.log(
      `   Ignore whitelist: ${config.ignoreWhitelist.length} entries`
    );
  }

  console.log('');
}
