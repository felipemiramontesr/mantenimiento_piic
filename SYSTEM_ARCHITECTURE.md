# ARCHON SYSTEM: THE SOVEREIGN STANDARD

## Archon System Architecture — ArchonCore Sovereign v.17.0.0

This manifesto serves as the architectural foundation for the **Pinnacle Identity Standard (PIIC)** applied to the Archon Control Systems. Every core decision follows a rigorous, zero-noise, and Silicon Valley-grade methodology (v.17.0.0).

---

### I. Stack Topologies & Quality Gates

The monorepository utilizes bleeding-edge tooling with distinct boundaries for isolation, performance, and security.

- **Frontend (Web):** React 18 (Modular Atomic Nodes), Vite, Tailwind CSS, Vitest (100% Core Coverage).
- **Backend (API):** Node.js, Fastify, Argon2, MySQL2, Vitest (Contract Verification).
- **Static Analysis:** SonarJS (Cognitive Complexity), Security (Vulnerability Scanners), Unicorn (Hygiene).
- **Automation:** Playwright (E2E Golden Paths), Husky (Git Hooks), Commitlint (Conventional Commits).

---

### II. Modular Atomic Architecture (v.17.0.0)

The Archon Fleet module has been refactored from a monolithic "God Component" into specialized nodes synchronized via a central orchestrator.

```mermaid
graph TD
    subgraph Orchestrator [FleetModule.tsx]
        M[State Controller - useFleetForm]
    end

    subgraph AtomicNodes [Specialized Logic Nodes]
        G[FleetGridView.tsx]
        F[FleetRegistrationForm.tsx]
        S[FleetSuccessView.tsx]
    end

    M -->|Sync State| F
    G -->|Transition| M
    F -->|Submission| M
    M -->|Success Trigger| S
```

---

### III. Identity Fortification Lifecycle

Archon employs an Application-Level Encryption (ALE) mechanism with Searchable Encryption (Blind Indexing).

```mermaid
sequenceDiagram
    participant UI as FleetRegistrationForm
    participant Controller as useFleetForm
    participant API as Fastify Router
    participant ALE as Encryption Service
    participant DB as MySQL Sentinel

    UI->>Controller: Submit(formData)
    Controller->>API: POST /v1/fleet (Encrypted Session)
    API->>ALE: generateBlindIndex(EconomicNumber)
    API->>ALE: encrypt(SensitiveData)
    ALE-->>API: {iv:tag:cipher, sha256:hash}
    API->>DB: INSERT INTO fleet_units
    DB-->>API: 201 Created
    API-->>Controller: Success Payload
    Controller-->>UI: Success View Transition
```

---

### IV. Continuous Integration Ecosystem

- **Husky & Lint-Staged:** Blocks non-compliant commits.
- **SonarJS:** Enforces cognitive complexity < 20.
- **Vitest Thresholds:** Global 100% threshold for core fleet logic.
- **Playwright Gate:** Validates the Golden Path from Login to Registration.

---

### V. Data Entity Relationships (v.17.0.0)

```mermaid
erDiagram
    fleet_units ||--o{ technical_logs : maintains
    fleet_units {
        string id PK "FLXXX"
        string uuid
        string tag "Económico (Sovereign ID)"
        string numero_serie_hash "Blind Index (Searchable)"
        blob images "Visual Identity JSON"
        enum status "Operational State"
    }
```

---
*🔱 Archon System - Pinnacle Identity & Integrity Command*
