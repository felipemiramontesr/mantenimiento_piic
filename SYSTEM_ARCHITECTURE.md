# ARCHON SYSTEM

## Archon System Architecture — Engineering Blueprint (v.10.0.0)

This manifesto serves as the architectural foundation for the **Pinnacle Identity Standard (PIIC)** applied to the Archon Control Systems. Every core decision follows a rigorous, zero-noise, and Silicon Valley-grade methodology.

---

### I. Stack Topologies

The monorepository utilizes bleeding-edge tooling with distinct boundaries for isolation, performance, and security.

- **Frontend (Web):** React 18, Vite, Tailwind CSS, Vitest.
- **Backend (API):** Node.js, Fastify, Argon2, MySQL2, Vitest.
- **Monorepo Managers:** NPM Workspaces.
- **QA Standards:** ESLint (strictest config), Prettier on `pre-commit` via Husky, 100% Core Test Coverage Threshold.

---

### II. High-Level Node/React Connectivity

The interaction between the client presentation layer and the API microservices is strictly handled via an internal Axios Gateway with an automated Bearer token injection.

```mermaid
graph TD
    subgraph Frontend [React Application - Client Site]
        A[Login.tsx] --> B{Axios API Client}
        B -->|Injects Bearer Token| B
        B -->|Detects 401: Auto-Redirect| A
    end

    subgraph Backend [Fastify API - Server Node]
        C[Router Gateway] --> D{JWT Verifier Middleware}
        D -->|Pass| E[Service Controllers]
        E --> F[(MySQL Production DB)]
    end

    B ==>|HTTPs/REST| C
```

---

### III. Authentication & Zero-Trust Protocol

The following diagram tracks the payload execution during a standard login request. Archon employs an Application-Level Encryption (ALE) mechanism, meaning sensitive data (like emails) are retrieved encrypted and decrypted purely inside the API layer.

```mermaid
sequenceDiagram
    autonumber
    actor User as Field Engineer
    participant React as Frontend (React)
    participant Auth as Auth Router (Fastify)
    participant DB as System DB (MySQL)
    participant ALE as Encryption Service

    User->>React: Enters ID & Password
    React->>Auth: POST /auth/login { username, password }
    Auth->>DB: SELECT id, password_hash, email FROM users
    DB-->>Auth: [Encrypted Email, Hash Payload]
    Auth->>Auth: Verify Argon2 Hash
    alt Password valid
        Auth->>ALE: Decrypt AES-256-GCM (Email)
        ALE-->>Auth: Plaintext Email
        Auth->>Auth: Sign JWT Token
        Auth-->>React: 200 OK + JWT + User Object
        React->>React: LocalStorage Save
        React->>User: Redirect to /dashboard
    else Invalid Password
        Auth-->>React: 401 Unauthorized
        React->>User: Display Generic Error
    end
```

---

### IV. Continuous Integration & Quality Assurance

- **Husky & Lint-Staged:** Blocks commits lacking correct style compliance (Prettier).
- **Vitest Thresholds:** Enforces `lines: 100`, `branches: 100`, `functions: 100`, `statements: 100` on Core Services and UI Logic. If a developer attempts a regression or unchecked fallback, the PR is automatically flagged and blocked.

---

### V. Fleet Asset Lifecycle Orchestration (v.9.0.0)

The following diagram illustrates the flow from asset incorporation to temporal maintenance baseline registry.

```mermaid
sequenceDiagram
    participant U as UI (FleetModule)
    participant C as Constants (Centralized)
    participant A as API (Fastify)
    participant M as Mapper (toSnakeCase)
    participant D as Database (MySQL)

    U->>C: Pull Catalog (Brands/Models)
    U->>U: Collect Form Data (camelCase)
    U->>A: POST /v1/fleet (JSON Payload)
    A->>A: Zod Validation (Schema v.9.0.0)
    A->>M: toSnakeCase(payload)
    M-->>A: DB-Ready Object
    A->>D: INSERT INTO fleet_units
    D-->>A: Success (FLXXX)
    A-->>U: HTTP 201 Created
```

### VI. Data Entity Relationships

```mermaid
erDiagram
    fleet_units ||--o{ technical_logs : maintains
    fleet_units {
        string id PK "FLXXX"
        string uuid
        string tag "Económico"
        enum asset_type
        json images "Visual Identity (Max 4)"
        date protocol_start_date "Temporal Anchor"
        enum maintenance_frequency "Schedule Logic"
    }
```
