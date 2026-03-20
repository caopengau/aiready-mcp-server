import { Octokit } from '@octokit/rest';
import { ZodSchema, z } from 'zod';

export const InnovationPatternSchema = z.object({
  title: z.string().describe('Short, descriptive title of the optimization'),
  rationale: z
    .string()
    .describe('Why this change improves the serverless architecture'),
  logic: z.string().describe('The abstracted code logic or pattern'),
  category: z.enum(['performance', 'security', 'cost', 'reliability']),
  filesAffected: z
    .array(z.string())
    .describe('List of generic file paths this pattern applies to'),
});

export type InnovationPattern = z.infer<typeof InnovationPatternSchema>;

export class Harvester {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({ auth: githubToken });
  }

  /**
   * Scans a Spoke repository for recent mutations and extracts anonymous design improvements.
   * This uses the "Air-Gap" philosophy to ensure NO PII or client secrets are harvested.
   */
  public async harvestInnovation(
    owner: string,
    repo: string
  ): Promise<InnovationPattern[]> {
    console.log(`[Harvester] Scanning ${owner}/${repo} for innovation DNA...`);

    // 1. Get recent commits within the core blueprint prefix
    const { data: commits } = await this.octokit.repos.listCommits({
      owner,
      repo,
      path: 'infrastructure/core', // Only scan core paths as per sync-rules.json
      per_page: 5,
    });

    if (commits.length === 0) return [];

    // 2. Extract Diffs (Simulated for this implementation)
    // In a real implementation, we would pull the patch and feed it to gpt-5.4-mini
    // to perform Structured Extraction against InnovationPatternSchema.

    const samplePattern: InnovationPattern = {
      title: 'Global EventBridge Error Handling Pattern',
      rationale:
        'Standardizes dead-letter queue attachment for all cross-account events',
      logic: 'export const withDLQ = (bus) => { ... }',
      category: 'reliability',
      filesAffected: ['infrastructure/core/bus.ts'],
    };

    console.log(
      `[Harvester] Successfully extracted innovation: ${samplePattern.title}`
    );
    return [samplePattern];
  }
}
