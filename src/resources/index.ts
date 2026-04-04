import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StateStore } from '../state-store.js';

export function registerResourceHandlers(server: any, stateStore: StateStore) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
        {
          uri: 'aiready://project/roadmap',
          name: 'AIReady Readiness Roadmap',
          description: 'A prioritized plan to reach elite readiness.',
          mimeType: 'text/markdown',
        },
      ],
    };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    const { uri } = request.params;

    if (uri === 'aiready://project/summary') {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: stateStore.getSummaryMarkdown(),
          },
        ],
      };
    }

    if (uri === 'aiready://project/issues') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: stateStore.getIssuesJson(),
          },
        ],
      };
    }

    if (uri === 'aiready://project/graph') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: stateStore.getGraphJson(),
          },
        ],
      };
    }

    if (uri === 'aiready://project/roadmap') {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: stateStore.getRoadmapMarkdown(),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
