# SuperHosur — Production Readiness, Observability & Hardening Guide
Phase 18 Step 6 Hardening Pass

---

## 1. Architecture Overview
SuperHosur is a local commerce and industrial marketplace designed for Hosur, Tamil Nadu.
- **Frontend**: Vite + React 19 + TypeScript (Strict mode enabled, bundle splitting, React Router v7).
- **Styling**: Vanilla CSS with customized design system tokens, CSS variables, and notch-safe insets.
- **Backend / DB**: PostgreSQL running on Supabase with Row Level Security (RLS) across 100% of tables.
- **Transactional Edge Functions**: Deno TypeScript functions for omnichannel notifications (`dispatch-notification`), webhook reconciliation (`payment-webhook`), requirement AI extraction (`extract-requirement`), and health telemetry (`health`).

---

## 2. Environment Variables & Secrets Configuration

### Public Variables (Safe for Browser, `VITE_` prefix required)
| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL (`https://<project>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Public client publishable anon key |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key ID (`rzp_test_...` or `rzp_live_...`) |

### Server-Side Secrets (NEVER expose to frontend)
| Secret | Scope | Purpose |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Elevated administrative service role |
| `RAZORPAY_KEY_ID` | Backend / Edge | Razorpay API key identifier |
| `RAZORPAY_KEY_SECRET` | Backend / Edge | Razorpay order creation & signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Backend / Edge | HMAC-SHA256 webhook signature validation |
| `RESEND_API_KEY` | Edge Functions | Transactional email delivery via Resend |
| `WHATSAPP_ACCESS_TOKEN` | Edge Functions | Meta Graph API access token for WhatsApp messages |
| `WHATSAPP_PHONE_NUMBER_ID` | Edge Functions | Verified Meta Business WhatsApp phone number ID |

---

## 3. Observability & Health Checks

### Operational Health Endpoint
- **URL**: `https://<project-ref>.supabase.co/functions/v1/health`
- **Method**: `GET`
- **Checks Verified**:
  - `database`: PostgreSQL query latency & connectivity
  - `notifications_queue`: Outbound transactional queue availability
  - `payments`: Order database status & entitlement table availability
  - `config`: Presence of necessary environment secrets
- **Status Codes**:
  - `200 OK`: All checks healthy
  - `503 Service Unavailable`: One or more services degraded

### Request Correlation IDs
Every critical RPC exception, error boundary catch, and payment order generates a trace correlation ID formatted as:
`sh_<timestamp_base36>_<random_hex>` (e.g., `sh_lq1z9a_8f3a91b2`).
This identifier is displayed to users in fallback dialogs and logged in console telemetry for support escalation.

---

## 4. Error Handling & Privacy Hardening

### Centralized Error Reporting
- Centralized via `src/services/errorReporting.ts`.
- Captures React rendering errors, unhandled rejections (`window.onunhandledrejection`), and uncaught errors (`window.onerror`).
- Automatically strips/redacts sensitive keys (passwords, tokens, CVVs, pins, API secrets) before buffering or outputting.

### Safe User-Facing Error UI
- `ErrorBoundary` presents human-readable guidance (*"Something went wrong. Your session and listings remain safe."*) with the trace `Reference ID`.
- Stack traces and internal database codes (`P0001`, `42501`) are masked from end-user presentation.

---

## 5. Security & Rate Limiting Enforcement

### Rate Limits by Action Key
| Action Key | Window | Max Requests | Scope |
| :--- | :--- | :--- | :--- |
| `analytics_event` | 60 sec | 100 | Per user or browser session |
| `create_payment_order` | 60 sec | 10 | Per authenticated user |
| `verify_payment` | 60 sec | 20 | Per authenticated user |
| `update_owner_lead` | 60 sec | 100 | Per authenticated owner |
| `send_direct_message` | 60 sec | 20 | Per participant |
| `submit_abuse_report` | 3600 sec | 10 | Per user |
| `submit_review` | 3600 sec | 10 | Per user |
| `create_requirement` | 3600 sec | 15 | Per customer |
| `submit_quote` | 3600 sec | 30 | Per vendor |

---

## 6. Service Worker & Cache Integrity
- All Supabase endpoints (`/rest/v1`, `/auth/v1`, `/storage/v1`, `/realtime/v1`, `*.supabase.co`) bypass cache storage (`Network-Only`).
- Requests containing `Authorization` or `apikey` headers are never cached.
- Versioned static cache (`superhosur-shell-v1`) automatically flushes older versions on activate.

---

## 7. Webhook Idempotency & Reconciliation
- Razorpay Webhooks (`/functions/v1/payment-webhook`) verify HMAC-SHA256 signatures against `RAZORPAY_WEBHOOK_SECRET`.
- Every incoming event records `provider_event_id` in `payment_webhook_events`. Duplicate events return `200 OK` idempotently without repeating fulfillment actions.

---

## 8. Deployment Checklist
- [x] RLS enabled and verified on 100% of tables.
- [x] Zero plain text secrets in client bundles or source files.
- [x] Security headers and nosniff meta tags declared.
- [x] Production build passes with 0 TypeScript and 0 ESLint errors.
- [x] 198+ unit and integration regression tests passing.
