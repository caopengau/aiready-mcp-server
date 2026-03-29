import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry, ToolName } from '@aiready/core';

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
};

/**
 * AIReady MCP Server Implementation
 */
export class AIReadyMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'aiready-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();

    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
  }

  private async handleRemediation(args: {
    issue_id: string;
    file_path: string;
    context: string;
  }) {
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
      ];

      return {
        tools: [
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
                  description:
                    'The unique ID of the issue to fix (from a scan).',
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
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'get_remediation_diff') {
          return await this.handleRemediation(
            args as {
              issue_id: string;
              file_path: string;
              context: string;
            }
          );
        }

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

        if (!args || typeof args.path !== 'string') {
          throw new Error('Missing required argument: path');
        }

        console.error(`[MCP] Executing ${name} on ${args.path}`);

        const results = await provider.analyze({
          rootDir: args.path,
        });

        // Format results for the agent
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
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
