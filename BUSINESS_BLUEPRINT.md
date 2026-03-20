# 🏛️ ClawMore: The Managed Serverless Business Empire

**Vision:** To provide "Evolution-as-a-Service" (EaaS) by managing, securing, and autonomously evolving client infrastructure through a Hub-and-Spoke agentic architecture.

---

## 🏗️ 1. The Hub-and-Spoke Architecture (The Factory)

We don't just sell software; we manage the **lifecycle** of the client's stack.

### **The Hub (ClawMore Core)**

- **The Management Account**: Owns the AWS Organization, the Stripe integration, and the "Master" Agentic Swarm.
- **The Vending Machine (`vending.ts`)**: Programmatically creates and bootstraps new AWS accounts for clients.
- **The Master Registry**: Contains the canonical "Agentic Ready" blueprints that we sync to all spokes.

### **The Spokes (Tenant Instances)**

- **Isolated Environments**: Each client operates in a dedicated AWS account with hard-deny SCPs to prevent "Idle Debt" (no EC2, no RDS, no SageMaker).
- **Spoke Repositories**: Client-specific Git repos that our agents scan, refactor, and mutate.
- **The Upstream Sync**: Core improvements in the Hub are pushed to all spokes via `make sync`, ensuring every client is on the most advanced evolution path.

---

## 💰 2. The Profit Engine (The Taxes)

Our revenue is directly tied to the efficiency and evolution of the client's stack.

| Revenue Stream        | Pricing        | Logic                                                         |
| :-------------------- | :------------- | :------------------------------------------------------------ |
| **Platform Fee**      | $29.00/mo      | Managed infra + $29.00 compute/token credit buffer.           |
| **Evolution Service** | **FREE**       | Included for **Co-evolution Partners** (Opt-in to Sync Back). |
| **Private Mutation**  | $1.00/mutation | Deducted from credit for **Isolated Mode** (Opt-out).         |
| **Compute Overage**   | Cost + 20%     | Auto-billed after credit buffer is exhausted.                 |

---

## 🛡️ 3. Governance & The Moat (Security)

### **The "ClawMost" Perimeter**

All client Spoke repositories are hosted as **Private Repos** within the `clawmost` GitHub Organization. This ensures:

1.  **Unified Harvesting**: The Management Plane has "Org-level" read access for evolution extraction.
2.  **IP Protection**: Clients own their logic, but the "Managed Node" infrastructure remains under our governance.
3.  **One-Click Revocation**: If the subscription ($29/mo) fails, we can programmatically archive the repo and suspend the AWS bootstrap role.

### **The "Shadow" Bus**: `MutationPerformed` events are emitted by our platform agents to a cross-account EventBridge bus. Clients cannot "code out" the tax.

- **Zero-Idle SCPs**: Hard-deny policies prevent clients from spinning up expensive, non-serverless resources, keeping our margins high and their "Waste Score" low.
- **Verified Mutation**: Every agent change must pass a `ValidationAgent` check (using GPT-5.4 for high-performance code reasoning) before a commit is made, protecting the client's uptime and our reputation.
- **Co-evolution Opt-in (Tax Waiver)**: Clients can opt-in to the "Harvester" protocol. By allowing the Management Plane to extract anonymous "Innovation Patterns" from their Spoke, they contribute to the collective intelligence of the Hub. In exchange, the $1.00 Evolution Tax is permanently waived for their account.
- **Curated Evolution (IP Shield)**: The "Harvester" uses **Structured Extraction** (JSON Schema) to pull only the "DNA" of an improvement. By forcing a schema that only allows logic and rationale, we create a mathematical "Air-Gap" that prevents client secrets from leaking.
- **Management Plane Review**: All proposals land in the **ClawMore Dashboard** for unified curation. This keeps the Mother repo's `main` branch protected from experimental or messy local optimizations until they are vetted and promoted.

- **Harvester Injection**: The "Harvester" agent is NOT included in the Mother `serverlessclaw` repo. It utilizes gpt-5.4-mini for cost-effective, high-volume scanning of Spokes, ensuring the Mother repo stays lean and focused on the product.

---

## 🚀 4. Operational Roadmap (Scaling)

### **Phase 1: Foundation (March 2026)**

- [x] AWS Organization Vending implementation.
- [x] Stripe metered billing for Mutation Tax.
- [x] "Evolution Tax" reporting logic.

### **Phase 2: Expansion (Q2 2026)**

- [ ] **Multi-Tenant Dashboard**: Real-time visualization of "Evolution ROI" for clients.
- [ ] **Skill Marketplace**: Allow clients to "install" new agent capabilities (e.g., "SEO Agent," "Security Hardening Agent").
- [ ] **Automated Onboarding**: 1-click "Connect GitHub" -> "Deploy Managed AWS Node."

### **Phase 3: Dominance (Q3 2026)**

- [ ] **Autonomous Upstream**: Clients' agents contribute successful refactors back to the Hub (with approval).
- [ ] **The "Exit Tax"**: Logic for offboarding managed accounts while retaining IP for the evolution patterns.

---

**Status:** `READY_FOR_PROFIT`  
**Managed By:** ClawMore Agentic Swarm
