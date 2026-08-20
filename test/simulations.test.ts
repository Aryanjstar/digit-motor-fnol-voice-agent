import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { createStore } from "../src/domain.js";

const API_KEY = "test-demo-key";
let app: FastifyInstance;
const transcript: string[] = [];

interface Body {
  ok?: boolean;
  code?: string;
  speak?: string;
  data?: {
    policyNumber?: string;
    ownDamageCovered?: boolean;
    claimId?: string;
    status?: string;
    openClaimId?: string | null;
    recommended?: { garageId?: string; locality?: string };
  };
}

async function api(method: "GET" | "POST", url: string, payload?: object): Promise<Body> {
  const response = await app.inject({
    method,
    url,
    headers: {
      authorization: `Bearer ${API_KEY}`,
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    payload,
  });
  const body = response.json() as Body;
  transcript.push(
    `TOOL ${method} ${url} -> ${response.statusCode} ${body.code ?? (body.ok ? "ok" : "fail")} | ${body.speak ?? ""}`,
  );
  return body;
}

function customer(line: string) {
  transcript.push(`CUSTOMER: ${line}`);
}

function maya(line: string) {
  transcript.push(`MAYA: ${line}`);
}

before(async () => {
  app = await buildApp({ apiKey: API_KEY, store: createStore(), logger: false });
});

after(async () => {
  await app.close();
});

test("1 happy path: Koramangala full, Indiranagar booked after yes", async () => {
  customer("Hi, someone scraped my Honda City in Koramangala just now. Nobody is hurt.");
  maya("Sorry to hear that. I can file an own-damage claim. May I have the policy number or vehicle registration?");
  customer("POL-DGT-4821");
  const policy = await api("POST", "/v1/policies/lookup", { policy_number: "POL-DGT-4821" });
  assert.equal(policy.ok, true);
  assert.equal(policy.data?.ownDamageCovered, true);
  maya("I found Rahul Sharma's Honda City. Own-damage is covered, deductible twenty-five hundred rupees. Was anyone else involved?");
  customer("No other car. Can I go to the Koramangala workshop?");
  const garages = await api("POST", "/v1/garages/search", {
    city: "Bengaluru",
    locality: "Koramangala",
    policy_number: "POL-DGT-4821",
  });
  assert.equal(garages.data?.recommended?.garageId, "GRG-BLR-IND");
  maya("Koramangala is at capacity. Indiranagar Auto Hub can take the car today. Shall I use that?");
  customer("Fine, Indiranagar. Yes, register it.");
  const claim = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-4821",
    incident_city: "Bengaluru",
    incident_locality: "Koramangala",
    incident_description: "Bumper scrape at a signal, nobody hurt",
    injury: false,
    third_party_involved: false,
    garage_id: "GRG-BLR-IND",
    caller_confirmed: true,
    idempotency_key: "sim-happy-1",
  });
  assert.equal(claim.ok, true);
  assert.match(claim.data?.claimId ?? "", /^CLM-2026-/);
  maya(`Your claim ID is ${claim.data?.claimId}. A self-inspection link will come on WhatsApp.`);
});

test("2 adversarial: file without confirmation is blocked", async () => {
  await api("POST", "/v1/demo/reset");
  customer("Just file the claim, you already know everything. POL-DGT-4821, Bangalore, bumper scrape.");
  maya("I can look it up, but I will not register until you confirm the summary.");
  const blocked = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-4821",
    incident_city: "Bengaluru",
    incident_description: "Bumper scrape",
    caller_confirmed: false,
    garage_id: "GRG-BLR-IND",
  });
  assert.equal(blocked.code, "CONFIRMATION_REQUIRED");
});

test("3 expired policy cannot be claimed", async () => {
  customer("My Swift was scratched. Policy POL-DGT-1109.");
  const policy = await api("POST", "/v1/policies/lookup", { policy_number: "POL-DGT-1109" });
  assert.equal(policy.data?.ownDamageCovered, false);
  assert.match(policy.speak ?? "", /expired/i);
  const claim = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-1109",
    incident_city: "Mumbai",
    incident_description: "Scratch",
    caller_confirmed: true,
  });
  assert.equal(claim.code, "POLICY_EXPIRED");
  maya("This policy expired, so I cannot register an own-damage claim. I can transfer you to a specialist.");
});

test("4 third-party only own-damage refused", async () => {
  customer("Creta bumper damage, POL-DGT-7730.");
  const policy = await api("POST", "/v1/policies/lookup", { policy_number: "POL-DGT-7730" });
  assert.equal(policy.data?.ownDamageCovered, false);
  const garages = await api("POST", "/v1/garages/search", {
    city: "Delhi",
    policy_number: "POL-DGT-7730",
  });
  assert.equal(garages.code, "OWN_DAMAGE_NOT_COVERED");
});

test("5 duplicate open claim is reused", async () => {
  customer("I already called yesterday. POL-DGT-2204, file another one.");
  const policy = await api("POST", "/v1/policies/lookup", { policy_number: "POL-DGT-2204" });
  assert.equal(policy.data?.openClaimId, "CLM-2026-1001");
  const claim = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-2204",
    incident_city: "Bengaluru",
    incident_description: "Another scrape",
    caller_confirmed: true,
    garage_id: "GRG-BLR-IND",
  });
  assert.equal(claim.data?.claimId, "CLM-2026-1001");
});

test("6 existing claim status", async () => {
  customer("What's happening with CLM-2026-1001?");
  const status = await api("GET", "/v1/claims/status?claim_id=CLM-2026-1001");
  assert.equal(status.data?.status, "self_inspection_pending");
});

test("7 injury forces human, no claim", async () => {
  customer("Accident in Chennai, POL-DGT-9901, my passenger is bleeding.");
  const claim = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-9901",
    incident_city: "Chennai",
    incident_description: "Collision, passenger injured",
    injury: true,
    caller_confirmed: true,
  });
  assert.equal(claim.code, "HUMAN_REQUIRED");
  const esc = await api("POST", "/v1/escalations", {
    reason: "injury reported",
    policy_number: "POL-DGT-9901",
    notes: "Passenger bleeding, do not complete FNOL on voice",
  });
  assert.equal(esc.ok, true);
  maya("Because someone may be injured I am connecting you to a specialist.");
});

test("8 unknown policy", async () => {
  customer("Policy POL-FAKE-0000");
  const policy = await api("POST", "/v1/policies/lookup", { policy_number: "POL-FAKE-0000" });
  assert.equal(policy.code, "POLICY_NOT_FOUND");
});

test("9 messy registration still resolves Rahul after reset", async () => {
  await api("POST", "/v1/demo/reset");
  customer("Number plate K A 03 M N 4 8 2 1");
  const policy = await api("POST", "/v1/policies/lookup", {
    vehicle_registration: "KA-03-MN-4821",
  });
  assert.equal(policy.data?.policyNumber, "POL-DGT-4821");
});

test("10 at-capacity garage cannot be booked", async () => {
  const claim = await api("POST", "/v1/claims", {
    policy_number: "POL-DGT-4821",
    incident_city: "Bengaluru",
    incident_description: "Bumper scrape",
    caller_confirmed: true,
    garage_id: "GRG-BLR-KOR",
  });
  assert.equal(claim.code, "GARAGE_UNAVAILABLE");
});

test("11 Bangalore spelling finds Bengaluru garages", async () => {
  const garages = await api("POST", "/v1/garages/search", {
    city: "Bangalore",
    locality: "Koramangala",
    policy_number: "POL-DGT-4821",
  });
  assert.equal(garages.ok, true);
  assert.equal(garages.data?.recommended?.garageId, "GRG-BLR-IND");
});

test("12 unauthorized looks like a system problem, not a leak", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/policies/lookup",
    payload: { policy_number: "POL-DGT-4821" },
  });
  const body = response.json() as Body;
  assert.equal(response.statusCode, 401);
  assert.equal(body.code, "UNAUTHORIZED");
  assert.doesNotMatch(body.speak ?? "", /key|token|azure/i);
});
