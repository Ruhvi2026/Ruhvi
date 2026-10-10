# Protected Documentation Rule

`PROJECT_ARCHITECTURE_DOCS.md` and `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` are marked as critical project documents. Under no circumstances should any automated process, optimization, refactoring, or AI agent delete, relocate, or overwrite these files without explicit user instruction. `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` is the primary authoritative source of truth for all tools, third-party integrations, DNS architecture, skills, and MCP servers.

# Integration Audit Rule

Whenever a major update is made to the project that involves adding, removing, or significantly modifying a third-party service, SDK, API, package, authentication provider, payment gateway, or analytics tool, you MUST update the `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` file in the project root to reflect these changes.

# Strict Optimization Rules

When performing optimizations, code cleanups, or refactoring, you MUST adhere to the following strict guidelines to prevent breaking existing functionality:

1. **Zero Functional Breakage**: Under no circumstances should an optimization alter or break the existing application flow, business logic, authentication (Firebase Auth), or integrations (e.g., referral links, verification links).
2. **Do Not Auto-Remove Services**: If you identify redundant services (e.g., multiple notification or analytics providers like Resend and Brevo, or PostHog), you must ONLY recommend consolidation. DO NOT proactively remove or replace working services without explicit user approval.
3. **Double-Check Blind Approvals**: If an optimization has a risk of breaking functionality (e.g., system-wide service replacement) and the user blindly approves it, you MUST pause, highlight specific risks, and ask the user for a final re-verification before proceeding.
4. **Safe Optimizations Allowed**: You may perform non-destructive optimizations such as image compression, format changes, lazy loading, and background JS performance tweaks.
5. **Honor Explicit Deletions Only**: You may only remove services or integrations if the user explicitly instructs you to do so.

# Knowledge Graph Tooling Guidance

- **Primary Knowledge Graph Pipeline**: Always use the project's native `.ua/` pipeline (`.ua/finalize-knowledge-graph.mjs`, `.ua/build-architecture-and-tour.mjs`) and `understand` skill suite (`understand-dashboard`, `understand-domain`, etc.) for analyzing Project Ruhvi's architecture, generating domain flows, and maintaining agent context.
- **Graphify (`graphifyy`) Utility**: The Python CLI tool `graphifyy` (installed globally/environment) serves as an optional auxiliary utility. Use it for quick multi-format exports (D3 trees, GraphML, Obsidian notes, Neo4j Cypher) or when rapidly indexing external, non-JavaScript third-party codebases. Do not substitute `graphify` for the native `.ua` knowledge graph pipeline.



