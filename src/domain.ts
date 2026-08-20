import { speakInr, speakPolicy, speakVehicle } from "./speak.js";

export type CoverType = "comprehensive" | "third_party";
export type PolicyStatus = "active" | "expired";
export type GarageAvailability = "available_today" | "available_tomorrow" | "at_capacity";
export type ClaimStatus = "registered" | "self_inspection_pending" | "closed";

export interface Policy {
  policyNumber: string;
  holderName: string;
  phone: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  city: string;
  coverType: CoverType;
  status: PolicyStatus;
  expiresOn: string;
  deductibleInr: number;
  idvInr: number;
  notes: string;
}

export interface Garage {
  garageId: string;
  name: string;
  city: string;
  locality: string;
  address: string;
  availability: GarageAvailability;
  waitDays: number;
  cashless: boolean;
}

export interface Claim {
  claimId: string;
  policyNumber: string;
  vehicleRegistration: string;
  incidentDate: string;
  incidentCity: string;
  incidentLocality: string;
  incidentDescription: string;
  injury: boolean;
  thirdPartyInvolved: boolean;
  garageId: string | null;
  status: ClaimStatus;
  createdAt: string;
  nextStep: string;
}

export interface Escalation {
  escalationId: string;
  reason: string;
  policyNumber: string | null;
  claimId: string | null;
  notes: string;
  createdAt: string;
}

export interface ApiSuccess<T> {
  ok: true;
  speak: string;
  data: T;
}

export interface ApiFailure {
  ok: false;
  code: string;
  speak: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function normalizeReg(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function parseIncidentDate(value: string | undefined, now = new Date()): string {
  if (!value || value.trim().toLowerCase() === "today") return todayIso(now);
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return todayIso(now);
  return parsed.toISOString().slice(0, 10);
}

export const POLICIES: Policy[] = [
  {
    policyNumber: "POL-DGT-4821",
    holderName: "Rahul Sharma",
    phone: "9876500001",
    vehicleRegistration: "KA03MN4821",
    vehicleMake: "Honda",
    vehicleModel: "City",
    vehicleYear: 2022,
    city: "Bengaluru",
    coverType: "comprehensive",
    status: "active",
    expiresOn: "2027-03-14",
    deductibleInr: 2500,
    idvInr: 850000,
    notes: "Happy-path demo policy. Own-damage cashless is allowed.",
  },
  {
    policyNumber: "POL-DGT-1109",
    holderName: "Priya Nair",
    phone: "9876500002",
    vehicleRegistration: "MH12AB1109",
    vehicleMake: "Maruti",
    vehicleModel: "Swift",
    vehicleYear: 2019,
    city: "Mumbai",
    coverType: "comprehensive",
    status: "expired",
    expiresOn: "2026-01-08",
    deductibleInr: 2000,
    idvInr: 420000,
    notes: "Expired policy. Agent must refuse FNOL and offer a human for renewal help.",
  },
  {
    policyNumber: "POL-DGT-7730",
    holderName: "Arjun Mehta",
    phone: "9876500003",
    vehicleRegistration: "DL01CD7730",
    vehicleMake: "Hyundai",
    vehicleModel: "Creta",
    vehicleYear: 2021,
    city: "Delhi",
    coverType: "third_party",
    status: "active",
    expiresOn: "2027-06-01",
    deductibleInr: 0,
    idvInr: 0,
    notes: "Third-party only. Own-damage / bumper scrape is not covered.",
  },
  {
    policyNumber: "POL-DGT-2204",
    holderName: "Sneha Iyer",
    phone: "9876500004",
    vehicleRegistration: "KA05EF2204",
    vehicleMake: "Hyundai",
    vehicleModel: "i20",
    vehicleYear: 2020,
    city: "Bengaluru",
    coverType: "comprehensive",
    status: "active",
    expiresOn: "2026-11-30",
    deductibleInr: 2000,
    idvInr: 510000,
    notes: "Already has an open claim. Duplicate FNOL should return the existing ID.",
  },
  {
    policyNumber: "POL-DGT-9901",
    holderName: "Karthik Raman",
    phone: "9876500005",
    vehicleRegistration: "TN09GH9901",
    vehicleMake: "Tata",
    vehicleModel: "Nexon",
    vehicleYear: 2023,
    city: "Chennai",
    coverType: "comprehensive",
    status: "active",
    expiresOn: "2027-01-20",
    deductibleInr: 3000,
    idvInr: 920000,
    notes: "Use for injury / human-escalation demos.",
  },
];

export const GARAGES: Garage[] = [
  {
    garageId: "GRG-BLR-KOR",
    name: "Digit Cashless — Koramangala Motors",
    city: "Bengaluru",
    locality: "Koramangala",
    address: "12 5th Block, Koramangala, Bengaluru",
    availability: "at_capacity",
    waitDays: 4,
    cashless: true,
  },
  {
    garageId: "GRG-BLR-IND",
    name: "Digit Cashless — Indiranagar Auto Hub",
    city: "Bengaluru",
    locality: "Indiranagar",
    address: "100 Feet Road, Indiranagar, Bengaluru",
    availability: "available_today",
    waitDays: 0,
    cashless: true,
  },
  {
    garageId: "GRG-BLR-WFD",
    name: "Digit Cashless — Whitefield Service",
    city: "Bengaluru",
    locality: "Whitefield",
    address: "ITPL Main Road, Whitefield, Bengaluru",
    availability: "available_tomorrow",
    waitDays: 1,
    cashless: true,
  },
  {
    garageId: "GRG-MUM-AND",
    name: "Digit Cashless — Andheri West",
    city: "Mumbai",
    locality: "Andheri",
    address: "SV Road, Andheri West, Mumbai",
    availability: "available_today",
    waitDays: 0,
    cashless: true,
  },
  {
    garageId: "GRG-DEL-SKT",
    name: "Digit Cashless — Saket",
    city: "Delhi",
    locality: "Saket",
    address: "Press Enclave Road, Saket, New Delhi",
    availability: "available_today",
    waitDays: 0,
    cashless: true,
  },
  {
    garageId: "GRG-CHN-TNM",
    name: "Digit Cashless — T Nagar",
    city: "Chennai",
    locality: "T Nagar",
    address: "Usman Road, T Nagar, Chennai",
    availability: "available_tomorrow",
    waitDays: 1,
    cashless: true,
  },
];

const OPEN_CLAIM_SNEHA: Claim = {
  claimId: "CLM-2026-1001",
  policyNumber: "POL-DGT-2204",
  vehicleRegistration: "KA05EF2204",
  incidentDate: "2026-08-18",
  incidentCity: "Bengaluru",
  incidentLocality: "Jayanagar",
  incidentDescription: "Rear bumper scrape in basement parking",
  injury: false,
  thirdPartyInvolved: false,
  garageId: "GRG-BLR-IND",
  status: "self_inspection_pending",
  createdAt: "2026-08-18T09:15:00.000Z",
  nextStep: "Complete smartphone self-inspection from the WhatsApp link already sent.",
};

export interface Store {
  policies: Policy[];
  garages: Garage[];
  claims: Claim[];
  escalations: Escalation[];
  idempotency: Map<string, string>;
  claimSeq: number;
  escalationSeq: number;
}

export function createStore(): Store {
  return {
    policies: structuredClone(POLICIES),
    garages: structuredClone(GARAGES),
    claims: [structuredClone(OPEN_CLAIM_SNEHA)],
    escalations: [],
    idempotency: new Map(),
    claimSeq: 1001,
    escalationSeq: 0,
  };
}

function fail(code: string, speak: string, details?: Record<string, unknown>): ApiFailure {
  return { ok: false, code, speak, details };
}

function present(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function findPolicy(
  store: Store,
  input: { policyNumber?: string; vehicleRegistration?: string; phone?: string },
): Policy | undefined {
  const policyNumber = present(input.policyNumber)?.toUpperCase();
  const vehicle = present(input.vehicleRegistration)
    ? normalizeReg(input.vehicleRegistration as string)
    : undefined;
  const phone = present(input.phone)?.replace(/\D/g, "") || undefined;

  return store.policies.find((policy) => {
    if (policyNumber && policy.policyNumber === policyNumber) return true;
    if (vehicle && policy.vehicleRegistration === vehicle) return true;
    if (phone && policy.phone === phone && (policyNumber || vehicle)) return true;
    return false;
  });
}

export function lookupPolicy(
  store: Store,
  input: { policyNumber?: string; vehicleRegistration?: string; phone?: string },
): ApiResult<{
  policyNumber: string;
  holderName: string;
  vehicle: string;
  city: string;
  coverType: CoverType;
  status: PolicyStatus;
  expiresOn: string;
  deductibleInr: number;
  ownDamageCovered: boolean;
  openClaimId: string | null;
}> {
  if (!present(input.policyNumber) && !present(input.vehicleRegistration)) {
    return fail(
      "MISSING_IDENTIFIER",
      "I need either the policy number or the vehicle registration to look this up.",
    );
  }

  const policy = findPolicy(store, input);
  if (!policy) {
    return fail(
      "POLICY_NOT_FOUND",
      "I could not find a Digit motor policy with those details. Please recheck the policy number or registration, or I can transfer you to a specialist.",
    );
  }

  const openClaim = store.claims.find(
    (claim) => claim.policyNumber === policy.policyNumber && claim.status !== "closed",
  );
  const ownDamageCovered = policy.status === "active" && policy.coverType === "comprehensive";
  const vehicleLabel = `${policy.vehicleYear} ${policy.vehicleMake} ${policy.vehicleModel}`;

  let speak = `I found a ${policy.coverType.replace("_", " ")} policy, ${speakPolicy(policy.policyNumber)}, for ${policy.holderName}'s ${vehicleLabel}, registered as ${speakVehicle(policy.vehicleRegistration)}.`;
  if (policy.status === "expired") {
    speak += ` It expired on ${policy.expiresOn}, so I cannot register a new own-damage claim on it.`;
  } else if (policy.coverType === "third_party") {
    speak += " This plan covers third-party liability only, not damage to your own car.";
  } else {
    speak += ` Own-damage is covered. The deductible is ${speakInr(policy.deductibleInr)}.`;
  }
  if (openClaim) {
    speak += ` There is already an open claim, ${openClaim.claimId}.`;
  }

  return {
    ok: true,
    speak,
    data: {
      policyNumber: policy.policyNumber,
      holderName: policy.holderName,
      vehicle: vehicleLabel,
      city: policy.city,
      coverType: policy.coverType,
      status: policy.status,
      expiresOn: policy.expiresOn,
      deductibleInr: policy.deductibleInr,
      ownDamageCovered,
      openClaimId: openClaim?.claimId ?? null,
    },
  };
}

function cityKey(value: string): string {
  return value.trim().toLowerCase().replace(/bangalore/g, "bengaluru");
}

export function searchGarages(
  store: Store,
  input: { city: string; locality?: string; policyNumber?: string },
): ApiResult<{
  ownDamageCovered: boolean;
  recommended: Garage | null;
  alternatives: Garage[];
}> {
  const city = present(input.city);
  if (!city) {
    return fail("MISSING_CITY", "I need the city where the accident happened to find a cashless garage.");
  }

  if (input.policyNumber) {
    const policy = findPolicy(store, { policyNumber: input.policyNumber });
    if (!policy) {
      return fail("POLICY_NOT_FOUND", "I could not verify that policy, so I should not recommend a cashless garage yet.");
    }
    if (policy.status === "expired") {
      return fail(
        "POLICY_EXPIRED",
        "This policy is expired, so cashless repair is not available. I can transfer you to a specialist if you want help renewing.",
      );
    }
    if (policy.coverType === "third_party") {
      return fail(
        "OWN_DAMAGE_NOT_COVERED",
        "This policy is third-party only, so Digit cannot send the car to a cashless garage for own-damage repairs.",
      );
    }
  }

  const matches = store.garages.filter((garage) => cityKey(garage.city) === cityKey(city));
  if (matches.length === 0) {
    return fail(
      "NO_GARAGE_IN_CITY",
      `I do not have a cashless garage listed in ${city}. I can transfer you to a specialist to arrange reimbursement or an out-of-network workshop.`,
    );
  }

  const locality = present(input.locality)?.toLowerCase();
  const preferred = locality
    ? matches.find((garage) => garage.locality.toLowerCase() === locality)
    : undefined;
  const sorted = [...matches].sort((a, b) => a.waitDays - b.waitDays);
  const recommended =
    preferred && preferred.availability !== "at_capacity"
      ? preferred
      : sorted.find((garage) => garage.availability !== "at_capacity") ?? preferred ?? sorted[0] ?? null;

  const alternatives = sorted.filter((garage) => garage.garageId !== recommended?.garageId).slice(0, 2);

  let speak: string;
  if (preferred?.availability === "at_capacity" && recommended && recommended.garageId !== preferred.garageId) {
    speak = `${preferred.name} in ${preferred.locality} is at capacity, about ${preferred.waitDays} days. The next cashless option is ${recommended.name} in ${recommended.locality}, which can take the car ${recommended.waitDays === 0 ? "today" : "tomorrow"}.`;
  } else if (recommended?.availability === "at_capacity") {
    speak = `The cashless garages I have in ${city} are currently at capacity. I can transfer you to a specialist to arrange the next step.`;
  } else if (recommended) {
    const when = recommended.waitDays === 0 ? "today" : "tomorrow";
    speak = `The closest cashless option is ${recommended.name} in ${recommended.locality}. They can take the car ${when}.`;
  } else {
    speak = `I could not find an open cashless garage in ${city}.`;
  }

  return {
    ok: true,
    speak,
    data: {
      ownDamageCovered: true,
      recommended,
      alternatives,
    },
  };
}

export function getClaim(store: Store, claimId: string): ApiResult<Claim> {
  const id = claimId.trim().toUpperCase();
  if (!id) return fail("MISSING_CLAIM_ID", "I need the claim ID to check the status.");
  const claim = store.claims.find((item) => item.claimId === id);
  if (!claim) {
    return fail("CLAIM_NOT_FOUND", `I could not find claim ${id}. Please recheck the number, or I can look up the policy instead.`);
  }
  return {
    ok: true,
    speak: `Claim ${claim.claimId} is ${claim.status.replaceAll("_", " ")}. Next step: ${claim.nextStep}`,
    data: claim,
  };
}

function coverageGate(policy: Policy): ApiFailure | null {
  if (policy.status === "expired") {
    return fail(
      "POLICY_EXPIRED",
      `Policy ${speakPolicy(policy.policyNumber)} expired on ${policy.expiresOn}, so I cannot register a new claim on it.`,
    );
  }
  if (policy.coverType === "third_party") {
    return fail(
      "OWN_DAMAGE_NOT_COVERED",
      "This policy covers third-party liability only. Damage to your own car is not covered, so I should not register an own-damage claim. I can transfer you to a specialist if a third party was involved.",
    );
  }
  return null;
}

export interface RegisterClaimInput {
  policyNumber: string;
  vehicleRegistration?: string;
  incidentDate?: string;
  incidentCity: string;
  incidentLocality?: string;
  incidentDescription: string;
  injury: boolean;
  thirdPartyInvolved: boolean;
  garageId?: string;
  callerConfirmed: boolean;
  idempotencyKey?: string;
}

export function registerClaim(store: Store, input: RegisterClaimInput): ApiResult<Claim> {
  if (!input.callerConfirmed) {
    return fail(
      "CONFIRMATION_REQUIRED",
      "I have not registered anything yet. Please confirm the incident, vehicle, and garage, then I can file the claim.",
    );
  }
  if (input.injury) {
    return fail(
      "HUMAN_REQUIRED",
      "Because someone may be injured, I should not complete this on voice. I am transferring you to a claims specialist.",
      { escalate: true, reason: "injury" },
    );
  }

  const policy = findPolicy(store, {
    policyNumber: input.policyNumber,
    vehicleRegistration: input.vehicleRegistration,
  });
  if (!policy) {
    return fail("POLICY_NOT_FOUND", "I could not verify the policy, so I did not register a claim.");
  }

  const blocked = coverageGate(policy);
  if (blocked) return blocked;

  if (input.idempotencyKey && store.idempotency.has(input.idempotencyKey)) {
    const existingId = store.idempotency.get(input.idempotencyKey)!;
    const existing = store.claims.find((claim) => claim.claimId === existingId);
    if (existing) {
      return {
        ok: true,
        speak: `That claim is already registered as ${existing.claimId}. ${existing.nextStep}`,
        data: existing,
      };
    }
  }

  const open = store.claims.find(
    (claim) => claim.policyNumber === policy.policyNumber && claim.status !== "closed",
  );
  if (open) {
    return {
      ok: true,
      speak: `I did not create a second claim. You already have open claim ${open.claimId}. ${open.nextStep}`,
      data: open,
    };
  }

  let garage: Garage | undefined;
  if (present(input.garageId)) {
    garage = store.garages.find((item) => item.garageId === input.garageId);
    if (!garage) {
      return fail("INVALID_GARAGE", "That garage ID is not in the cashless network. Please pick one of the garages I offered.");
    }
    if (garage.availability === "at_capacity") {
      return fail(
        "GARAGE_UNAVAILABLE",
        `${garage.name} is at capacity. Please choose an available cashless garage before I file the claim.`,
      );
    }
  }

  store.claimSeq += 1;
  const claim: Claim = {
    claimId: `CLM-2026-${store.claimSeq}`,
    policyNumber: policy.policyNumber,
    vehicleRegistration: policy.vehicleRegistration,
    incidentDate: parseIncidentDate(input.incidentDate),
    incidentCity: input.incidentCity,
    incidentLocality: input.incidentLocality?.trim() || garage?.locality || policy.city,
    incidentDescription: input.incidentDescription.trim(),
    injury: false,
    thirdPartyInvolved: Boolean(input.thirdPartyInvolved),
    garageId: garage?.garageId ?? null,
    status: "self_inspection_pending",
    createdAt: new Date().toISOString(),
    nextStep: garage
      ? `A self-inspection link will be sent on WhatsApp. Take the car to ${garage.name} after you complete it. Deductible is ${speakInr(policy.deductibleInr)}.`
      : `A self-inspection link will be sent on WhatsApp. Deductible is ${speakInr(policy.deductibleInr)}.`,
  };
  store.claims.push(claim);
  if (input.idempotencyKey) store.idempotency.set(input.idempotencyKey, claim.claimId);

  const garageSpeak = garage ? ` I have noted ${garage.name} in ${garage.locality} as the cashless workshop.` : "";
  return {
    ok: true,
    speak: `Your claim is registered. The claim ID is ${claim.claimId}.${garageSpeak} ${claim.nextStep}`,
    data: claim,
  };
}

export function createEscalation(
  store: Store,
  input: { reason: string; policyNumber?: string; claimId?: string; notes?: string },
): ApiResult<Escalation> {
  if (!input.reason?.trim()) {
    return fail("MISSING_REASON", "I need a short reason before transferring you.");
  }
  store.escalationSeq += 1;
  const escalation: Escalation = {
    escalationId: `ESC-2026-${String(store.escalationSeq).padStart(3, "0")}`,
    reason: input.reason.trim(),
    policyNumber: input.policyNumber?.trim().toUpperCase() ?? null,
    claimId: input.claimId?.trim().toUpperCase() ?? null,
    notes: input.notes?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  store.escalations.push(escalation);
  return {
    ok: true,
    speak: "I am transferring you to a Digit claims specialist now. They will have this context.",
    data: escalation,
  };
}

export const DEMO_SCENARIOS = [
  {
    id: "A",
    name: "Happy path",
    caller: "Rahul Sharma",
    use: "POL-DGT-4821 / KA03MN4821, Koramangala bumper scrape, accept Indiranagar garage",
  },
  {
    id: "B",
    name: "Requested garage unavailable",
    caller: "Rahul Sharma",
    use: "Ask for Koramangala. API returns at_capacity and recommends Indiranagar.",
  },
  {
    id: "C",
    name: "Expired policy",
    caller: "Priya Nair",
    use: "POL-DGT-1109. Agent must not register a claim.",
  },
  {
    id: "D",
    name: "Third-party only",
    caller: "Arjun Mehta",
    use: "POL-DGT-7730. Own-damage is not covered.",
  },
  {
    id: "E",
    name: "Duplicate open claim",
    caller: "Sneha Iyer",
    use: "POL-DGT-2204 already has CLM-2026-1001.",
  },
  {
    id: "F",
    name: "Injury escalation",
    caller: "Karthik Raman",
    use: "POL-DGT-9901 with injury=true. Do not register; transfer.",
  },
  {
    id: "G",
    name: "Bypass confirmation",
    caller: "Rahul Sharma",
    use: "register_claim with caller_confirmed false must fail.",
  },
];
