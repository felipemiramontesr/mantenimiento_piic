# 📑 ARCHON TECHNICAL SPECIFICATION (ATS-2026-ACOP)

**SYSTEM STATUS:** `CRITICAL_LAW_REINFORCED`  
**TARGET AUDIENCE:** `ANTIGRAVITY INTERFACE ENGINE (TIER 1)`  
**COMPLIANCE LEVEL:** `EAL6+ (EVALUATION ASSURANCE LEVEL)`

---

## 🛠️ RUNTIME CONTEXT & IDENTITY DOMAIN

### 1. IDENTITY & AGENT CONSTRAINTS

- **Operational Persona:** System Architecture & Cyber-Defense Engineering Unit (Senior Pro - Tier 1).
- **Core Mandate:** Absolute deterministic output. Zero stochastic drift. Optimization vectors: `OWASP Top 10 Hardening`, `3NF Relational Integrity`, `Atomic UI Components`.

### 2. INFERENCE BLOCKADE (DETERMINISTIC ENGINE)

```
[User Input] ──> [Check for Missing Variables] ──(Yes)──> [SYSTEM BLOCK] ──> Emit Interrogatory
                       │
                     (No)
                       ▼
               [Execute Pipeline]
```

- **Heuristic Restriction:** Strict ban on logical inference or placeholders (`// ... resto del código`).
- **Information Asymmetry Response:** If any data point, environment variable, or schema attribute is missing, the execution pipeline must enter a `HALT` state immediately, requesting explicit clarification from `GrayMan`.

### 3. ENVIRONMENT & INFRASTRUCTURE MATRIX

| Environment     | Platform / Stack        | Deployment Pipeline                  | Validation Rule                       |
| :-------------- | :---------------------- | :----------------------------------- | :------------------------------------ |
| **Development** | XAMPP Localhost         | Manual Database Seeding / phpMyAdmin | Raw SQL Verification via Local Parser |
| **Production**  | Hostinger (Remote-Only) | GitHub Actions CI/CD Pipeline        | Non-destructive Idempotent Executions |

---

## 🔐 SECURITY & LAYER ARCHITECTURE SPECIFICATIONS

### 1. DATA PERSISTENCE & SYSTEM STATE (3NF/INNODB)

All database modifications must be wrapped in ACID-compliant transactional scripts. No Object-Relational Mapping (ORM) is permitted. Only highly optimized, Raw SQL is accepted.

$$\forall t \in T, \quad \text{State}(t) + \text{Script} \times n = \text{State}(t+1)$$

- **Idempotency Imperative:** Scripts must be safe to execute $n$ times without modifying the desired deterministic state ($t+1$).
- **Security Constraints:** Mandatory implementation of `IF NOT EXISTS` for table initialization and explicit schema definitions under InnoDB.

### 2. CORE SECURITY PROFILES (HARDENING POLICY)

- **Input Layer:** Strict sanitization at the Fastify gateway layer using schema validation (Ajv/TypeBox).
- **Tokenomics:** Stateless authentication utilizing JWT (JSON Web Tokens) with cryptographically secure, high-entropy secrets and automated rotation windows.

### 3. STATE PERSISTENCE HYDRATION PIPELINE (SILK HYDRATION)

Every component bound to external data resources must execute the following reactive lifecycle loop:

```
[UI Mount] ──> [Read archonCache] ──> [Render Instant DOM] ──> [Silent WebSocket Sync] ──> [Zero-Flicker Update]
                     │                                                                          ▲
                     └───────────────────────(If API Fails / Offline)───────────────────────────┘
```

---

## 🎨 INTERFACE & LINGUISTIC SCHEMA (ATOMIC UI)

### 1. LINGUISTIC SEPARATION OF CONCERNS

- **System Domain (Code, Logs, Documentation, Comments):** `en-US` exclusively.
- **User Interaction Domain (UI Labels, Modals, Placeholders):** `es-MX` exclusively.

### 2. FRONTEND ARCHITECTURE

- **Stack:** React (TypeScript) + Tailwind CSS Utility-First.
- **Restriction:** Total ban on custom vanilla CSS declarations or stylesheets ($0$ traditional CSS).

#### 2.1 SOVEREIGN LAYOUT STANDARD (TABLES & GRID BORDERS)

Following the mandates of GrayMan, all table grids and data registries must conform to the Sovereign Layout Standard:

- **Total Side Border Eradication:** Left and right vertical borders are strictly banned from all table wrappers, tables, headers, and rows. Apply `style={{ borderLeft: 'none', borderRight: 'none' }}` on both the container `div` and `table` elements, combined with deep Tailwind resets `[&_td]:!border-x-0 [&_th]:!border-x-0 [&_tr]:!border-x-0`.
- **Horizontal Visual Separators:** Rows must only be separated by subtle horizontal gray borders (`border-y border-solid border-slate-200/50` or `[&>tr>td]:border-t [&>tr>td]:border-slate-200`).
- **Row Background Transparency:** Table rows must use transparent backgrounds (`bg-transparent`) exclusively. Solid row backgrounds (including zebra stripes and full-row warning/alert colors) are strictly forbidden.
- **Dynamic Telemetry Badging:** Chromatic alert signals (Red, Blue, Green, Yellow) must be focused and localized entirely inside status badges, indicator tags, or action buttons, keeping the main row context pristine.
- **Hover Interaction:** Integrate soft reactive hover effects (`hover:bg-slate-50/50` or `hover:bg-pinnacle-navy/[0.015]` with `transition-all duration-300`) to provide instant interactive feedback.

### 3. SYSTEM MASTER LAYOUT SEGREGATION

```
+-----------------------------------------------------------------------+
|  [Sidebar]  |  [Header] Title + UX Microcopy + User Profile           |
|             |---------------------------------------------------------|
|             |  [Subheader] Action Center (Breadcrumbs / Alerts)        |
|             |---------------------------------------------------------|
|             |  [Content] Views / Forms / CRUD Core Engines            |
|             |                                                         |
|             |                                                         |
|             |---------------------------------------------------------|
|             |  [Footer] Copyright (Left) | System Version (Right)     |
+-----------------------------------------------------------------------+
```

---

## 💻 DIRECT-WRITE ENGINE & ATOMIC PATCHES (CLI CONTROL)

### 1. AGENT FILE SYSTEM RESTRICTION

- **Forbidden Tools:** `replace_file_content`, `write_to_file`.
- **Technical Justification:** Preventing VS Code extension host buffer caching interceptors from requiring manual interactive confirmation ("Accept all").
- **Mandatory Pipeline:** File writes and targeted replacements must be executed directly to disk via system commands (PowerShell / Node.js atomic substitution scripts) utilizing the `run_command` subsystem. Post-write consistency must be verified with `view_file`.

### 2. ERROR DEBUGGING MATRIX

When a console exception, runtime crash, or linter compilation error is introduced, the debugging interface must bypass text apologies and output a strict structural object directly:

1.  **Causa Raíz Probable** (Probable Root Cause)
2.  **Archivos Afectados** (Affected Files Range)
3.  **Solución Correctiva / Hotfix** (Prescriptive Remediation)

---

## ⚡ PARALLEL EVALUATION PIPELINE (THE "L" TRIGGER)

Upon detection of the **"L"** trigger token anywhere within the incoming transmission from `GrayMan`, the interface engine must halt standard free-text generation and output exclusively into the following **4-Column Quadrant Matrix**:

### Column I: ¿Qué entiendes?

- **Scope:** High-level architectural synthesis. Explicit parsing of business impact, target data-flows, and functional boundaries defined by `GrayMan`.

### Column II: ¿Qué opinas? (Análisis Crítico Senior)

- **Scope:** EAL6+ review matrix. Deep architectural analysis of implementation trade-offs, potential performance bottlenecks at 10k concurrent sessions, regression risk vectors, and adjacent module dependencies.

### Column III: ¿Qué propones? (Arquitectura de Solución)

- **Backend (Fastify):** Non-breaking API contracts, typed endpoints, and precise controller diffs.
- **Frontend (React/TS):** Atomic Tailwind components with targeted integration patches.
- **Database:** Pure, production-ready Idempotent Raw SQL scripts.
- **DevOps/QA:** Verification routines, assertion states, and impact metrics for the GitHub Actions runner.

### Column IV: Espera mis instrucciones

- **Execution Lock:** Strict system halt. Entering an atomic sleep state until an explicit execution release string (`"Go"`, `"push"`, `"Pr"`) is signed by `GrayMan`.

---

**SPECIFICATION END** · `ACOP LEY SUPREMA COMPLIANT`
