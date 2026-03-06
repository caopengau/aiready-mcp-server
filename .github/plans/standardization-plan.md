# Key & Tool Naming Standardization Plan

> **Objective:** Eliminate "Mapping Hell" by enforcing a single Canonical ID for every tool across the CLI, Platform, and core types.

---

## 📐 The Standard

| Tool / Metric | Old CLI Shorthand | Old Platform Key | **NEW Canonical ID** | Friendly UI Label |
| :--- | :--- | :--- | :--- | :--- |
| Pattern Detection | `patterns` | `semanticDuplicates` | **`pattern-detect`** | Semantic Duplicates |
| Context Analysis | `context` | `contextFragmentation` | **`context-analyzer`** | Context Fragmentation |
| Consistency | `consistency` | `namingConsistency` | **`naming-consistency`** | Naming Consistency |
| AI Signal Clarity | `ai-signal` | `aiSignalClarity` | **`ai-signal-clarity`** | AI Signal Clarity |
| Agent Grounding | `grounding` | `agentGrounding` | **`agent-grounding`** | Agent Grounding |
| Testability | `testability` | `testabilityIndex` | **`testability-index`** | Testability Index |
| Doc Drift | `doc-drift` | `documentationHealth` | **`doc-drift`** | Documentation Health |
| Deps Health | `deps-health` | `dependencyHealth` | **`dependency-health`** | Dependency Health |
| Change Amp | `change-amp` | `changeAmplification` | **`change-amplification`** | Change Amplification |

---

## 🏗️ Implementation Phases

### Phase 1: Core Definitions (@aiready/core)
- [x] Define `ToolName` Enum with canonical kebab-case strings.
- [x] Update `UnifiedReport` schema to use `[K in ToolName]` as keys for the breakdown.
- [x] Create a `FriendlyNames` mapping constant for UI usage.

### Phase 2: CLI Migration (@aiready/cli)
- [x] Update `analyzeUnified` to return results using Canonical IDs.
- [x] Update `scoreUnified` to use Canonical IDs in the `toolScores` map.
- [x] Maintain CLI aliases (e.g., `--tools patterns`) but map them to Canonical IDs internally.

### Phase 3: Platform Migration (@aiready/platform)
- [x] Update `normalizeReport` to stop "guessing" keys and strictly expect Canonical IDs.
- [x] **Data Migration Layer:** Add robust legacy mapping in `normalizeReport` to handle existing S3 records.
- [x] Update Dashboard UI to use `FriendlyNames` mapping from `core`.

### Phase 4: Downstream Updates
- [x] Update Visualizer to use Canonical IDs.
- [x] Update VS Code Extension providers.

---

## 📉 Progress Tracker

| Component | Canonical IDs | Friendly Labels | Migration Logic | Status |
| :--- | :---: | :---: | :---: | :--- |
| **@aiready/core** | ✅ | ✅ | n/a | Completed |
| **@aiready/cli** | ✅ | ✅ | ✅ | Completed |
| **platform** | ✅ | ✅ | ✅ | Completed |
| **visualizer** | ✅ | ✅ | n/a | Completed |

---

## 📝 Change Log

- **2026-03-06:** Standardization plan established following "Mapping Hell" bug discovery where platform dashboard showed 0 for several metrics due to key divergence.
- **2026-03-06:** Successfully standardized all tool IDs across Core, CLI, Platform, Visualizer, and VS Code. Enforced Canonical IDs while maintaining legacy compatibility.
