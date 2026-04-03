import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry, ToolName } from '@aiready/core';
import { z } from 'zod';

/**
 * Zod schemas for tool arguments
 */
const AnalysisArgsSchema = z.object({
  path: z.string().describe('Path to the directory to analyze'),
  summary_only: z
    .boolean()
    .optional()
    .describe(
      'If true, returns only the summary and skips the detailed issue list. Best for large projects to save context.'
    ),
});

const RemediationArgsSchema = z.object({
  issue_id: z.string().describe('The unique ID of the issue to fix'),
  file_path: z.string().describe('The path to the file containing the issue'),
  context: z.string().describe('The content of the file or surrounding code'),
});

/**
 * Mapping between tool names and @aiready/ package names.
 * Used for dynamic registration on-demand to minimize initial context budget.
 */
const TOOL_PACKAGE_MAP: Record<string, string> = {
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
 * AIReady MCP Server Implementation
 */
export class AIReadyMcpServer {
  private server: Server;
  private version: string = '0.2.10';

  constructor() {
    this.server = new Server(
      {
        name: 'aiready-server',
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();

    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
  }

  private async handleRemediation(args: z.infer<typeof RemediationArgsSchema>) {
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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

  private setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'aiready://project/summary',
            name: 'AIReady Project Summary',
            description: 'Quick top-level AI-readiness summary.',
            mimeType: 'text/markdown',
          },
          {
            uri: 'aiready://project/issues',
            name: 'AIReady Critical Issues',
            description: 'List of top 10 critical readiness issues.',
            mimeType: 'application/json',
          },
          {
            uri: 'aiready://project/graph',
            name: 'AIReady Codebase Graph',
            description: 'Force-directed graph data for visualization.',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource content
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        if (uri === 'aiready://project/summary') {
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: '# AIReady Summary\n\nProject: Current Directory\nScore: 84/100 (B)\n\nCritical Issues: 2\nMajor Issues: 14\n\nRun the `aiready-mcp` tool for full analysis.',
              },
            ],
          };
        }

        if (
          uri === 'aiready://project/issues' ||
          uri === 'aiready://project/graph'
        ) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  message: 'Resource content coming from latest scan...',
                }),
              },
            ],
          };
        }

        throw new Error(`Resource not found: ${uri}`);
      }
    );

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'analyze-project',
            description:
              'Audit the project for AI-readiness and suggest improvements.',
            arguments: [
              {
                name: 'path',
                description: 'Path/directory to analyze',
                required: true,
              },
            ],
          },
          {
            name: 'remediate-issue',
            description: 'Help the user fix a specific AIReady issue.',
            arguments: [
              {
                name: 'issueId',
                description: 'The unique ID of the issue to fix',
                required: true,
              },
            ],
          },
        ],
      };
    });

    // Get prompt content
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'analyze-project') {
        const path = args?.path || '.';
        return {
          description: 'Project audit instructions',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I want to audit the project at "${path}" for AI-readiness. Please use the AIReady tools to identify duplication patterns, context fragmentation, and naming inconsistencies. Then, provide a prioritized list of improvements to help me leverage AI agents more effectively.`,
              },
            },
          ],
        };
      }

      if (name === 'remediate-issue') {
        const issueId = args?.issueId;
        return {
          description: 'Issue remediation instructions',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I've identified an AIReady issue with ID: ${issueId}. Please use the \`get_remediation_diff\` tool to find a fix, explain the rationale behind the recommended change, and then help me apply it to the codebase.`,
              },
            },
          ],
        };
      }

      throw new Error(`Prompt not found: ${name}`);
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Define canonical tool names to advertise to the client
      // These will be dynamically loaded on demand
      const toolsToAdvertise = [
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
      ];

      const tools: any[] = [
        ...toolsToAdvertise.map((id) => ({
          name: id,
          description: `Scan the directory for ${id} issues to improve AI-readiness.`,
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory to analyze',
              },
              summary_only: {
                type: 'boolean',
                description:
                  'If true, returns only the summary and skips the detailed issue list. Best for large projects to save context.',
              },
            },
            required: ['path'],
          },
        })),
        {
          name: 'get_remediation_diff',
          description:
            'Get a precise code diff to fix a specific AI-readiness issue (Requires AIReady API Key).',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: {
                type: 'string',
                description: 'The unique ID of the issue to fix (from a scan).',
              },
              file_path: {
                type: 'string',
                description: 'The path to the file containing the issue.',
              },
              context: {
                type: 'string',
                description: 'The content of the file or surrounding code.',
              },
            },
            required: ['issue_id', 'file_path', 'context'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'get_remediation_diff') {
          const parsedArgs = RemediationArgsSchema.safeParse(args);
          if (!parsedArgs.success) {
            throw new Error(
              `Invalid arguments for ${name}: ${parsedArgs.error.message}`
            );
          }
          return await this.handleRemediation(parsedArgs.data);
        }

        const parsedArgs = AnalysisArgsSchema.safeParse(args);
        if (!parsedArgs.success) {
          throw new Error(
            `Invalid arguments for ${name}: ${parsedArgs.error.message}`
          );
        }
        const { path: rootDir, summary_only } = parsedArgs.data;

        let provider = ToolRegistry.find(name);

        // Dynamic loading if not already registered (CLI pattern)
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
            console.error(
              `[MCP] Failed to load tool package ${packageName}: ${importErrorMessage}`
            );
            const error = new Error(
              `Tool ${name} not found and failed to load package ${packageName}: ${importErrorMessage}`
            );
            (error as { cause?: unknown }).cause = importError;
            throw error;
          }
        }

        if (!provider) {
          throw new Error(`Tool ${name} not found after attempting to load`);
        }

        console.error(
          `[MCP] Executing ${name} on ${rootDir}${
            summary_only ? ' (summary only)' : ''
          }`
        );

        const results = await provider.analyze({
          rootDir,
        });

        // Format results for the agent
        const responseData = summary_only
          ? {
              summary: results.summary,
              metadata: results.metadata,
              notice:
                'Detailed issues were omitted (summary_only: true). Run without summary_only for full details.',
            }
          : results;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AIReady MCP Server started');
  }

  getServer(): Server {
    return this.server;
  }
}

export function createSandboxServer(): Server {
  const mcp = new AIReadyMcpServer();
  return mcp.getServer();
}

// Bootstrap the server
const mcpServer = new AIReadyMcpServer();
mcpServer.run().catch((error) => {
  console.error('Fatal error starting AIReady MCP Server:', error);
  process.exit(1);
});

export default mcpServer;
