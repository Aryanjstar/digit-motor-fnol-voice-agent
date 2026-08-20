import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { createStore } from "../src/domain.js";

const API_KEY = "test-demo-key";
let app: FastifyInstance;

interface InjectJson {
  ok?: boolean;
  code?: string;
  speak?: string;
  data?: {
    policyNumber?: string;
    ownDamageCovered?: boolean;
    claimId?: string;
    status?: string;
    recommended?: { garageId?: string };
  };
}

async function json(
  method: "GET" | "POST",
  url: string,
  opts?: { body?: object; key?: string | null },
): Promise<{ status: number; body: InjectJson }> {
  const headers: Record<string, string> = {};
  if (opts?.key !== null) headers.authorization = `Bearer ${opts?.key ?? API_KEY}`;
  if (opts?.body) headers["content-type"] = "application/json";
  const response = await app.inject({
    method,
    url,
    headers,
    payload: opts?.body,
  });
  return { status: response.statusCode, body: response.json() as InjectJson };
}

before(async () => {
  app = await buildApp({ apiKey: API_KEY, store: createStore(), logger: false });
});

after(async () => {
  await app.close();
});

test("health is public", async () => {
  const { status, body } = await json("GET", "/health", { key: null });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

test("protected routes reject missing keys", async () => {
  const { status, body } = await json("POST", "/v1/policies/lookup", { key: null, body: { policy_number: "POL-DGT-4821" } });
  assert.equal(status, 401);
  assert.equal(body.code, "UNAUTHORIZED");
});

test("happy path policy lookup speaks coverage and deductible", async () => {
  const { status, body } = await json("POST", "/v1/policies/lookup", { body: { policy_number: "POL-DGT-4821" } });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data?.ownDamageCovered, true);
  assert.match(body.speak ?? "", /two thousand five hundred rupees/i);
});

test("lookup by messy vehicle registration", async () => {
  const { status, body } = await json("POST", "/v1/policies/lookup", {
    body: { vehicle_registration: "KA-03-MN-4821" },
  });
  assert.equal(status, 200);
  assert.equal(body.data?.policyNumber, "POL-DGT-4821");
});

test("unknown policy is 404", async () => {
  const { status, body } = await json("POST", "/v1/policies/lookup", { body: { policy_number: "POL-FAKE" } });
  assert.equal(status, 404);
  assert.equal(body.code, "POLICY_NOT_FOUND");
});

test("expired policy is not own-damage covered", async () => {
  const { status, body } = await json("POST", "/v1/policies/lookup", { body: { policy_number: "POL-DGT-1109" } });
  assert.equal(status, 200);
  assert.equal(body.data?.ownDamageCovered, false);
  assert.match(body.speak ?? "", /expired/i);
});

test("Koramangala garage is at capacity and Indiranagar is recommended", async () => {
  const { status, body } = await json("POST", "/v1/garages/search", {
    body: { city: "Bangalore", locality: "Koramangala", policy_number: "POL-DGT-4821" },
  });
  assert.equal(status, 200);
  assert.equal(body.data?.recommended?.garageId, "GRG-BLR-IND");
  assert.match(body.speak ?? "", /at capacity/i);
});

test("third-party policy cannot search cashless own-damage garages", async () => {
  const { status, body } = await json("POST", "/v1/garages/search", {
    body: { city: "Delhi", policy_number: "POL-DGT-7730" },
  });
  assert.equal(status, 409);
  assert.equal(body.code, "OWN_DAMAGE_NOT_COVERED");
});

test("register without confirmation is rejected", async () => {
  const { status, body } = await json("POST", "/v1/claims", {
    body: {
      policy_number: "POL-DGT-4821",
      incident_city: "Bengaluru",
      incident_description: "Bumper scrape",
      caller_confirmed: false,
      garage_id: "GRG-BLR-IND",
    },
  });
  assert.equal(status, 400);
  assert.equal(body.code, "CONFIRMATION_REQUIRED");
});

test("injury forces human escalation and does not create a claim", async () => {
  const { status, body } = await json("POST", "/v1/claims", {
    body: {
      policy_number: "POL-DGT-9901",
      incident_city: "Chennai",
      incident_description: "Collision, passenger hurt",
      injury: true,
      caller_confirmed: true,
    },
  });
  assert.equal(status, 409);
  assert.equal(body.code, "HUMAN_REQUIRED");
});

test("cannot book an at-capacity garage", async () => {
  const { status, body } = await json("POST", "/v1/claims", {
    body: {
      policy_number: "POL-DGT-4821",
      incident_city: "Bengaluru",
      incident_locality: "Koramangala",
      incident_description: "Front bumper scrape at a signal",
      caller_confirmed: true,
      garage_id: "GRG-BLR-KOR",
    },
  });
  assert.equal(status, 409);
  assert.equal(body.code, "GARAGE_UNAVAILABLE");
});

test("confirmed own-damage claim is created once and is idempotent", async () => {
  const payload = {
    policy_number: "POL-DGT-4821",
    incident_city: "Bengaluru",
    incident_locality: "Koramangala",
    incident_description: "Front bumper scrape at a signal",
    caller_confirmed: true,
    garage_id: "GRG-BLR-IND",
    idempotency_key: "demo-rahul-1",
  };
  const first = await json("POST", "/v1/claims", { body: payload });
  assert.equal(first.status, 201);
  assert.equal(first.body.ok, true);
  assert.match(first.body.data?.claimId ?? "", /^CLM-2026-/);

  const second = await json("POST", "/v1/claims", { body: payload });
  assert.equal(second.body.data?.claimId, first.body.data?.claimId);
});

test("duplicate open claim is reused for Sneha", async () => {
  const { status, body } = await json("POST", "/v1/claims", {
    body: {
      policy_number: "POL-DGT-2204",
      incident_city: "Bengaluru",
      incident_description: "Another scrape",
      caller_confirmed: true,
      garage_id: "GRG-BLR-IND",
    },
  });
  assert.equal(status, 201);
  assert.equal(body.data?.claimId, "CLM-2026-1001");
  assert.match(body.speak ?? "", /already have open claim/i);
});

test("claim status and escalation", async () => {
  const statusRes = await json("GET", "/v1/claims/status?claim_id=CLM-2026-1001");
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data?.status, "self_inspection_pending");

  const esc = await json("POST", "/v1/escalations", {
    body: { reason: "caller asked for a human", policy_number: "POL-DGT-2204", claim_id: "CLM-2026-1001" },
  });
  assert.equal(esc.status, 201);
  assert.equal(esc.body.ok, true);
});

test("expired policy cannot register", async () => {
  const { status, body } = await json("POST", "/v1/claims", {
    body: {
      policy_number: "POL-DGT-1109",
      incident_city: "Mumbai",
      incident_description: "Scratch",
      caller_confirmed: true,
    },
  });
  assert.equal(status, 409);
  assert.equal(body.code, "POLICY_EXPIRED");
});
