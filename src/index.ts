import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  handleAnalysis,
  handleRemediation,
  ADVERTISED_TOOLS,
  RemediationArgsSchema,
  BestPracticesArgsSchema,
  handleGetBestPractices,
  ComplianceArgsSchema,
  handleCheckCompliance,
  ContextBudgetArgsSchema,
  handleAnalyzeContextBudget,
} from './tools/index.js';
import { registerResourceHandlers } from './resources/index.js';
import { registerPromptHandlers } from './prompts/index.js';
import { stateStore } from './state-store.js';

/**
 * AIReady MCP Server Implementation
 */
export class AIReadyMcpServer {
  private server: Server;
  private version: string = '0.3.0';

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

  private setupHandlers() {
    // Register Resource Handlers
    registerResourceHandlers(this.server, stateStore);

    // Register Prompt Handlers
    registerPromptHandlers(this.server);

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: any[] = [
        ...ADVERTISED_TOOLS.map((id) => ({
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
          const parsedArgs = RemediationArgsSchema.parse(args);
          return await handleRemediation(parsedArgs);
        }

        if (name === 'get_best_practices') {
          const parsedArgs = BestPracticesArgsSchema.parse(args);
          return await handleGetBestPractices(parsedArgs);
        }

        if (name === 'check_best_practice_compliance') {
          const parsedArgs = ComplianceArgsSchema.parse(args);
          return await handleCheckCompliance(parsedArgs);
        }

        if (name === 'analyze_context_budget') {
          const parsedArgs = ContextBudgetArgsSchema.parse(args);
          return await handleAnalyzeContextBudget(parsedArgs);
        }

        const results = await handleAnalysis(name, args, stateStore);

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
