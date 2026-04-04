import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { AIReadyMcpServer } from '../index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

describe('AIReadyMcpServer In-Process Integration', () => {
  let server: Server;
  let client: Client;

  beforeAll(async () => {
    const mcpApp = new AIReadyMcpServer();
    server = mcpApp.getServer();

    const [clientTransport, serverTransport] = InMemoryTransport.create();

    client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    // Connect them
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  it('should list tools in-process', async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('should execute get_best_practices in-process', async () => {
    const result = await client.callTool({
      name: 'get_best_practices',
      arguments: { category: 'patterns' },
    });
    expect((result.content[0] as any).text).toContain('Pattern');
  });

  it('should execute analyze_context_budget in-process', async () => {
    const result = await client.callTool({
      name: 'analyze_context_budget',
      arguments: { file_path: 'package.json' },
    });
    expect((result.content[0] as any).text).toContain('Context Budget');
  });

  it('should execute check_best_practice_compliance in-process', async () => {
    const result = await client.callTool({
      name: 'check_best_practice_compliance',
      arguments: { file_path: 'package.json' },
    });
    expect((result.content[0] as any).text).toContain('Compliance');
  });

  it('should handle tool errors in-process', async () => {
    const result = await client.callTool({
      name: 'non-existent',
      arguments: { path: '.' },
    });
    expect(result.isError).toBe(true);
  });
});
