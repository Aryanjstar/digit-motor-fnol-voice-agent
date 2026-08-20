import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  createEscalation,
  createStore,
  DEMO_SCENARIOS,
  getClaim,
  lookupPolicy,
  registerClaim,
  resetStore,
  searchGarages,
  type Store,
} from "./domain.js";

export interface AppOptions {
  apiKey: string;
  store?: Store;
  logger?: boolean;
}

const errorBody = {
  type: "object",
  properties: {
    ok: { type: "boolean", enum: [false] },
    code: { type: "string" },
    speak: { type: "string" },
    details: { type: "object", additionalProperties: true },
  },
} as const;

function sendResult(reply: FastifyReply, result: { ok: boolean; code?: string }, successStatus = 200) {
  if (!result.ok) {
    const code = result.code;
    const status =
      code === "MISSING_IDENTIFIER" ||
      code === "MISSING_CITY" ||
      code === "MISSING_CLAIM_ID" ||
      code === "MISSING_REASON" ||
      code === "CONFIRMATION_REQUIRED"
        ? 400
        : code === "POLICY_NOT_FOUND" || code === "CLAIM_NOT_FOUND"
          ? 404
          : code === "POLICY_EXPIRED" ||
              code === "OWN_DAMAGE_NOT_COVERED" ||
              code === "GARAGE_UNAVAILABLE" ||
              code === "INVALID_GARAGE" ||
              code === "HUMAN_REQUIRED" ||
              code === "NO_GARAGE_IN_CITY"
            ? 409
            : 400;
    return reply.code(status).send(result);
  }
  return reply.code(successStatus).send(result);
}

function unauthorized(reply: FastifyReply) {
  return reply.code(401).send({
    ok: false,
    code: "UNAUTHORIZED",
    speak: "I am having trouble reaching the claims system. Please try again in a moment, or I can transfer you.",
  });
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const store = options.store ?? createStore();
  const app = Fastify({
    logger: options.logger
      ? {
          level: process.env.LOG_LEVEL ?? "info",
          redact: ["req.headers.authorization", "req.headers.x-api-key"],
        }
      : false,
  });

  await app.register(cors, { origin: false });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Digit Motor FNOL Demo API",
        version: "1.0.0",
        description:
          "Demonstration claims API for a Bolna voice agent. This is not Go Digit General Insurance's production API. It models policy lookup, cashless garage search, FNOL registration, claim status, and human escalation.",
      },
      servers: [{ url: "/", description: "Current host" }],
      tags: [
        { name: "health", description: "Liveness" },
        { name: "policies", description: "Policy verification" },
        { name: "garages", description: "Cashless network" },
        { name: "claims", description: "FNOL registration and status" },
        { name: "escalations", description: "Human handoff" },
        { name: "demo", description: "Fixture catalogue for evaluators" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key" },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const open =
      request.url.startsWith("/health") ||
      request.url.startsWith("/docs") ||
      request.url.startsWith("/documentation") ||
      request.url === "/openapi.json";
    if (open || request.method === "OPTIONS") return;

    const header = request.headers.authorization;
    const xKey = request.headers["x-api-key"];
    const token = header?.startsWith("Bearer ") ? header.slice(7) : typeof xKey === "string" ? xKey : undefined;
    if (!token || token !== options.apiKey) {
      return unauthorized(reply);
    }
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness probe",
        response: { 200: { type: "object", properties: { ok: { type: "boolean" }, service: { type: "string" } } } },
      },
    },
    async () => ({ ok: true, service: "digit-fnol-demo-api" }),
  );

  app.get("/openapi.json", async () => app.swagger());

  app.post(
    "/v1/policies/lookup",
    {
      schema: {
        tags: ["policies"],
        summary: "Look up a motor policy by policy number or vehicle registration",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            policy_number: { type: "string", description: "Policy number, e.g. POL-DGT-4821" },
            vehicle_registration: { type: "string", description: "Indian registration, with or without spaces" },
            phone: { type: "string", description: "Registered mobile, digits only or +91" },
          },
        },
        response: { 200: { type: "object", additionalProperties: true }, 400: errorBody, 401: errorBody, 404: errorBody },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        policy_number?: string;
        vehicle_registration?: string;
        phone?: string;
      };
      request.log.info({ action: "policy_lookup", policy_number: body.policy_number });
      return sendResult(
        reply,
        lookupPolicy(store, {
          policyNumber: body.policy_number,
          vehicleRegistration: body.vehicle_registration,
          phone: body.phone,
        }),
      );
    },
  );

  app.post(
    "/v1/garages/search",
    {
      schema: {
        tags: ["garages"],
        summary: "Find cashless garages near the incident",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["city"],
          properties: {
            city: { type: "string" },
            locality: { type: "string" },
            policy_number: { type: "string", description: "If provided, coverage is verified first" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { city: string; locality?: string; policy_number?: string };
      request.log.info({ action: "garage_search", city: body.city, locality: body.locality });
      return sendResult(
        reply,
        searchGarages(store, { city: body.city, locality: body.locality, policyNumber: body.policy_number }),
      );
    },
  );

  app.post(
    "/v1/claims",
    {
      schema: {
        tags: ["claims"],
        summary: "Register FNOL after the caller has confirmed the summary",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["policy_number", "incident_city", "incident_description", "caller_confirmed"],
          properties: {
            policy_number: { type: "string" },
            vehicle_registration: { type: "string" },
            incident_date: { type: "string", description: "YYYY-MM-DD or 'today'" },
            incident_city: { type: "string" },
            incident_locality: { type: "string" },
            incident_description: { type: "string" },
            injury: { type: "boolean", default: false },
            third_party_involved: { type: "boolean", default: false },
            garage_id: { type: "string" },
            caller_confirmed: { type: "boolean" },
            idempotency_key: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        policy_number: string;
        vehicle_registration?: string;
        incident_date?: string;
        incident_city: string;
        incident_locality?: string;
        incident_description: string;
        injury?: boolean | string;
        third_party_involved?: boolean | string;
        garage_id?: string;
        caller_confirmed: boolean | string;
        idempotency_key?: string;
      };
      const bool = (value: boolean | string | undefined, fallback = false) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") return ["true", "yes", "1"].includes(value.toLowerCase());
        return fallback;
      };
      request.log.info({
        action: "register_claim",
        policy_number: body.policy_number,
        garage_id: body.garage_id,
        confirmed: body.caller_confirmed,
      });
      return sendResult(
        reply,
        registerClaim(store, {
          policyNumber: body.policy_number,
          vehicleRegistration: body.vehicle_registration,
          incidentDate: body.incident_date,
          incidentCity: body.incident_city,
          incidentLocality: body.incident_locality,
          incidentDescription: body.incident_description,
          injury: bool(body.injury),
          thirdPartyInvolved: bool(body.third_party_involved),
          garageId: body.garage_id,
          callerConfirmed: bool(body.caller_confirmed),
          idempotencyKey: body.idempotency_key ?? request.headers["idempotency-key"]?.toString(),
        }),
        201,
      );
    },
  );

  app.get(
    "/v1/claims/status",
    {
      schema: {
        tags: ["claims"],
        summary: "Get claim status by claim ID",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["claim_id"],
          properties: { claim_id: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { claim_id } = request.query as { claim_id: string };
      request.log.info({ action: "claim_status", claim_id });
      return sendResult(reply, getClaim(store, claim_id));
    },
  );

  app.post(
    "/v1/escalations",
    {
      schema: {
        tags: ["escalations"],
        summary: "Log a human transfer before handing off",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["reason"],
          properties: {
            reason: { type: "string" },
            policy_number: { type: "string" },
            claim_id: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        reason: string;
        policy_number?: string;
        claim_id?: string;
        notes?: string;
      };
      request.log.info({ action: "escalation", reason: body.reason, policy_number: body.policy_number });
      return sendResult(reply, createEscalation(store, {
        reason: body.reason,
        policyNumber: body.policy_number,
        claimId: body.claim_id,
        notes: body.notes,
      }), 201);
    },
  );

  app.get(
    "/v1/demo/scenarios",
    {
      schema: {
        tags: ["demo"],
        summary: "Catalogue of seeded demo scenarios",
        security: [{ bearerAuth: [] }],
      },
    },
    async () => ({
      ok: true,
      disclaimer:
        "Seeded demonstration data only. Not affiliated with Go Digit General Insurance Limited production systems.",
      scenarios: DEMO_SCENARIOS,
    }),
  );

  app.post(
    "/v1/demo/reset",
    {
      schema: {
        tags: ["demo"],
        summary: "Restore seeded policies, garages, and claims for repeatable demos",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      request.log.info({ action: "demo_reset" });
      resetStore(store);
      return { ok: true, speak: "Demo data restored to the original seed." };
    },
  );

  return app;
}
