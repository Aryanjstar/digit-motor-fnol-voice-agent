# Digit Motor FNOL Voice Agent

Inbound voice workflow for **Go Digit General Insurance** motor First Notice of Loss, built for a Bolna AI Solutions Engineer take-home.

The agent is **Maya**, a Digit claims specialist. She verifies a policy, checks own-damage cover, finds a cashless garage, and registers a claim only after the caller confirms. This repository is the supporting demo API, prompts, and tool schemas.

> **Not an official Digit product.** Go Digit is a real listed insurer (NSE: `GODIGIT`) with a 24/7 motor helpline. The HTTP API in this repo is a **demonstration integration** that models that workflow. It is not Digit’s production claims system.

## Problem

Digit already registers motor claims by phone (“no forms”, target about seven minutes). Callers are often roadside, stressed, and unable to use an app. A voice agent can complete routine own-damage FNOL, keep humans for injury, theft, and disputes, and still produce a claim ID the caller can repeat.

Digit’s FY25 transparency reporting is the business case: high first-time call resolution and average talk time under six minutes. That is the length of a credible demo, not a compressed toy dialogue.

## Why voice

| App / chat | Voice |
| --- | --- |
| Needs eyes and a stable network | Works at the roadside |
| Forms drop off under stress | One question at a time |
| Garage lists are easy to dump | Must offer at most two options |

## Architecture

```text
Caller  →  Bolna voice agent (Maya)
              │  custom functions (HTTPS + bearer)
              ▼
         Digit FNOL demo API  (this repo, Azure Container Apps)
              │
              ├─ policy lookup
              ├─ cashless garage search
              ├─ claim register (confirmation + idempotency)
              ├─ claim status
              └─ escalation log
```

Business rules live in the API so a prompt cannot invent cover, file without a yes, or book a full garage.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/docs` | Swagger UI |
| `POST` | `/v1/policies/lookup` | Policy + coverage |
| `POST` | `/v1/garages/search` | Cashless workshops |
| `POST` | `/v1/claims` | Register FNOL |
| `GET` | `/v1/claims/status?claim_id=` | Existing claim |
| `POST` | `/v1/escalations` | Human-handoff log |
| `GET` | `/v1/demo/scenarios` | Seeded demo catalogue |

All routes except `/health` and `/docs` require `Authorization: Bearer $DEMO_API_KEY`.

Every JSON body includes a `speak` string. Bolna should say that, not the raw payload.

### Local run

```bash
cp .env.example .env
# set DEMO_API_KEY to a long random value
npm install
npm test
npm run dev
```

Open http://localhost:3000/docs

## Demo data

| Policy | Registration | What it is for |
| --- | --- | --- |
| `POL-DGT-4821` | `KA03MN4821` | Happy path (Rahul Sharma, Honda City, Bengaluru) |
| `POL-DGT-1109` | `MH12AB1109` | Expired |
| `POL-DGT-7730` | `DL01CD7730` | Third-party only |
| `POL-DGT-2204` | `KA05EF2204` | Duplicate open claim `CLM-2026-1001` |
| `POL-DGT-9901` | `TN09GH9901` | Injury → human |

Koramangala cashless (`GRG-BLR-KOR`) is **at capacity**. Indiranagar (`GRG-BLR-IND`) is the recommended alternative. That is the edge case in the recorded demo.

## Bolna agent

| Field | Value |
| --- | --- |
| Name | Digit Motor FNOL — Maya |
| Prompt | [`bolna/system-prompt.md`](bolna/system-prompt.md) |
| Welcome | [`bolna/welcome-message.txt`](bolna/welcome-message.txt) |
| Tools | [`bolna/tools/`](bolna/tools/) |
| Chat tests | [`bolna/chat-test-matrix.md`](bolna/chat-test-matrix.md) |
| Demo script | [`bolna/demo-script.md`](bolna/demo-script.md) |

Replace `{{PUBLIC_BASE_URL}}` and `{{DEMO_API_KEY}}` in the tool JSON with the deployed API URL and key. Do not commit the live key.

### Chat first

On [platform.bolna.ai](https://platform.bolna.ai) use **Chat with agent**. Do not place a phone call until the prompt and tools are stable. Phone calls consume Bolna credits.

**Test via browser** uses voice without a handset but can still consume LLM/TTS balance. Ask before using it if you are conserving credits.

## Deployment

Azure Container Apps, new resource group, consumption plan. Existing `rg-myriox-dev` is unrelated and must not be changed.

```bash
az containerapp up \
  --name ca-digit-fnol-api \
  --resource-group rg-bolna-digit-fnol \
  --location eastus2 \
  --source . \
  --ingress external \
  --target-port 3000 \
  --env-vars DEMO_API_KEY="$DEMO_API_KEY" PUBLIC_BASE_URL="$PUBLIC_BASE_URL"
```

After deploy, hit `/health`, then `/docs`, then a signed `POST /v1/policies/lookup`.

Scale to zero after the assignment if you want to stop compute cost:

```bash
az containerapp update -n ca-digit-fnol-api -g rg-bolna-digit-fnol --min-replicas 0
```

## Testing

`npm test` covers lookup, expired/third-party gates, garage capacity, confirmation lock, injury escalation, duplicates, and idempotency.

## Limitations

- In-memory store resets when the container restarts.
- Garage network is a small seeded set, not Digit’s live network.
- Transfer-to-human needs a destination number in the Bolna Tools tab. Until that is set, chat can only *log* the escalation.
- English-only for this demo. Digit’s real line is multilingual.

## Future

- Hindi + English auto-switch (Bolna multilingual_config)
- Caller-ID policy preload on inbound
- Persistent store and signed self-inspection links
- Outbound surveyor / garage confirmation calls
