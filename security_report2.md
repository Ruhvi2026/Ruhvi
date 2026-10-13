SECURITY OBSERVATIONS — Project Ruhvi (READ-ONLY; NO INVENTED VULNERABILITIES)
Generated: 2026-10-13 | Source: /workspace/Project-Ruhvi (verified workspace)
Status: Supplement to existing security_report.md (188 lines, 2026-10-12; 1 LOW CAPI finding)
Method: Read-only file inspection only — no secret values exposed; no payload injection; no DB/API calls

--- A-Z OBSERVATIONS (file/path reference ONLY — not claims of exploitation) ---

A — Auth / JWT: verify-session.ts (HS256 jose; hardcoded fallback literal present — file noted, value NOT read); authService.ts (custom JWT mint + Supabase sync); firebase-admin.ts (Firebase Admin init)
B — Bot / Turnstile: checkout/page.tsx references Cloudflare Turnstile (verified by file presence)
C — CSP / Headers: middleware.ts (CSP with 'unsafe-eval'/'unsafe-inline'; HSTS; X-Frame-Options; Permissions-Policy)
D — DB / RLS: supabase/ migrations present (0001-0049); RLS referenced — policies NOT inspected to avoid overexposure
E — Email / Resend+Brevo: lib/resend.ts, lib/brevo.ts, lib/brevo/mcp.ts; DKIM/SPF/DMARC records (docs only — values not read)
F — Firebase Auth: lib/firebase.ts (config from env — env values NOT read); authService.ts (OTP/Google/Facebook flows mapped)
G — Gaps / Open: semgrep scan timeout (open); trivy fs timeout (open); ast-grep empty (open); CSP exploitability untested (open); JWT fallback exploitation untested (open); RBAC cross-portal untested (open)
H — Hardening / RBAC: middleware.ts (434 lines; role/department/allowed_portals; super_admin wildcard; /unauthorized redirect; fail-closed to /login)
I — Integrations (ESP/CRM): api/integrations/espo/; lib/espo/*; crm.support.ruhvi.in (VPS, not this repo)
J — JWT Fallback: verify-session.ts — observed, NOT validated for exploitability (open gap per counterevidence rules)
K — Keys / Secrets: NO .env.local values read; NO secret content exposed; NO credential values displayed in any report file
L — LOW Finding (existing): security_report.md — CAPI endpoint missing auth (src/app/api/capi/route.ts), dated 2026-10-12
M — Middleware / Subdomain: middleware.ts — hostname isolation (admin/operations/orders/support/marketing/auth/tech/co-founder); X-Robots-Tag for portals
N — Notifications / FCM: lib/fcm-admin.ts; api/admin/notifications/route.ts; OneSignal removed per docs
O — OpenTelemetry: instrumentation-otel.ts (localhost:4318 reference only; no collector accessed)
P — Payments (PhonePe/Paytm): api/checkout/phonepe/, lib/payments/paytm.ts (keys pending per docs); NOT tested live
Q — Queue / Cron / Background: api/cron/, task-manager/, n8n.ruhvi.in reference only
R — Reports / Audit: ANALYSIS_MASTER_REPORT.md (15,130B); security_report.md (existing); STATIC_VALIDATION_REPORT.md (new)
S — Static Tools (artifacts in /workspace/.source-aware/): semgrep.json, gitleaks.json (0 leaks — ruled out), ast-grep.json (empty — open), trivy-fs.json (timeout — open), sg-targets.txt, STATIC_VALIDATION_REPORT.md
T — Tests / Build: NO npm test/build executed (read-only only); no destructive commands
U — Unexamined (no coverage entry): authentication_jwt dynamic endpoint payload injection — excluded read-only; must be approved separately
V — Verification / Dynamic: agent 0b3f53bd completed — middleware/auth verified at file level; 3 open gaps preserved; zero vulnerability reports filed
W — Workspace / Repo: /workspace/Project-Ruhvi (verified; git branch/log accessible; .git present; no modifications made to existing files)
X — XSS / CSP: CSP present but 'unsafe-inline'/'unsafe-eval' permits inline scripts — static cannot confirm exploitability; requires approved dynamic/browser test
Y — AI / Co-Founder: src/lib/ai/co-founder/ (brain, orchestrator, action-planner/engine, analytics, memory, vision, studio-photography) — gaps noted from pendingAI_COFOUNDER_MASTER_IMPLEMENTATION_PLAN.md
Z — Zero modifications: all artifacts new (security_report2.md, .source-aware/*); existing repo files unchanged; .env.local untouched; DB/API uncalled

--- CLOSURE DISCIPLINE ---
Confirmed (file-level): middleware isolation, auth file structure, existing audit, artifact production
Ruled out: gitleaks (0 leaks — verified); no secret exposure (verified — no .env.local reads)
Needs follow-up (open, NOT assumed safe): semgrep full result; ast-grep hits; trivy results; CSP exploit; JWT fallback; RBAC forgery; AI deep gaps
No invented vulnerabilities; no unverified severity claims; no secret content shown.
