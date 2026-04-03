# AIReady MCP Server

The AIReady MCP Server provides an integration point for AI agents (like Claude Desktop, Cursor, Windsurf, etc.) to assess AI-readiness and improve AI leverage directly within their conversational interfaces using the Model Context Protocol (MCP).

## 🛠 Capabilities

The AIReady MCP server exposes the following capabilities:

### 1. Analysis Tools

- **Scan Tools**: Run localized scans for `pattern-detect`, `context-analyzer`, `consistency`, `ai-signal-clarity`, `agent-grounding`, `testability`, `doc-drift`, `deps-health`, `change-amp`, and `contract-enforce`.
- **`get_remediation_diff`**: Get a precise code diff to fix identified AI-readiness issues.

### 2. Resources (Contextual Data)

- **`aiready://project/summary`**: A high-level overview of the project's AI-readiness score and issue count.
- **`aiready://project/issues`**: A JSON list of the top 10 most critical issues found in the latest scan.
- **`aiready://project/graph`**: Raw dependency and fragmentation graph data for visualization.

### 3. Prompts (Templates)

- **`analyze-project`**: A guided prompt to perform a full AI-readiness audit.
- **`remediate-issue`**: A template for fixing a specific issue using its ID.

---

## 🧱 Extension: AST Explorer Sibling

For deep code exploration, we also provide the **@aiready/ast-mcp-server**, which provides:

- Symbol resolution (`resolve_definition`)
- Reference finding (`find_references`)
- Call hierarchy (`get_call_hierarchy`)
- Implementation lookup (`find_implementations`)

Configure it alongside AIReady:

```json
"mcpServers": {
  "aiready": {
    "command": "npx",
    "args": ["-y", "@aiready/mcp-server"]
  },
  "ast-explorer": {
    "command": "npx",
    "args": ["-y", "@aiready/ast-mcp-server"]
  }
}
```

## Installation & Distribution Channels

### 1. Dedicated MCP Registries

- **[Smithery](https://smithery.ai)**: `npx @smithery/cli install @aiready/mcp-server`
- **[Glama](https://glama.ai/mcp)**: View listing.
- **[Pulsar](https://gotopulsar.com)**: Find on registry.

### 2. Direct IDE Integrations

#### Claude Desktop App / Cursor / Windsurf

Use the following command configuration:

```bash
npx -y @aiready/mcp-server
```

## Quick Start

To test the server locally, you can run:

```bash
npx @aiready/mcp-server
```

For more details on AIReady, visit [getaiready.dev](https://getaiready.dev).
