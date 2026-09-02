# Integration Audit Rule

Whenever a major update is made to the project that involves adding, removing, or significantly modifying a third-party service, SDK, API, package, authentication provider, payment gateway, or analytics tool, you MUST update the `PROJECT_INTEGRATIONS_AUDIT.md` file in the project root to reflect these changes.

Ensure that the **Integration Register** at the bottom of the file is always kept up-to-date with the current status of all integrations.

# Strict Optimization Rules

When performing optimizations, code cleanups, or refactoring, you MUST adhere to the following strict guidelines to prevent breaking existing functionality:

1. **Zero Functional Breakage**: Under no circumstances should an optimization alter or break the existing application flow, business logic, authentication (Firebase Auth), or integrations (e.g., referral links, verification links).
2. **Do Not Auto-Remove Services**: If you identify redundant services (e.g., multiple notification or analytics providers like Resend and Brevo, or PostHog), you must ONLY recommend consolidation. DO NOT proactively remove or replace working services without explicit user approval. (e.g., Do not replace Resend with Brevo for notifications without asking).
3. **Double-Check Blind Approvals**: If an optimization has a risk of breaking functionality (e.g., system-wide service replacement) and the user blindly approves it (e.g., "just execute it"), you MUST pause, highlight the specific risks, and ask the user for a final re-verification before proceeding.
4. **Safe Optimizations Allowed**: You may perform non-destructive optimizations such as image compression, format changes, lazy loading, and background JS performance tweaks, provided they do not alter the visual appearance or functionality of the website.
5. **Honor Explicit Deletions Only**: You may only remove services or integrations if the user explicitly instructs you to do so (e.g., "Delete Razorpay").
