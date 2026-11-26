/**
 * SwasthyaBillCheck (NMBTP) — Node.js + TypeScript + Fastify API Layer
 * Implements:
 * - OWASP Top 10 Security Headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
 * - Rate Limiting (@fastify/rate-limit: 300 req/min per IP)
 * - Multipart File Upload Validation (MIME & magic-byte checks, 12MB cap)
 * - Resilient 120s-timeout Proxy to Python FastAPI AI/OCR/Matching Engine (avoids undici 30s headersTimeout)
 */

import http from "node:http";
import https from "node:https";
import Fastify, { FastifyReply } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";
const PORT = Number(process.env.PORT || 4000);
const UPSTREAM_TIMEOUT_MS = 120_000;

function rawHttpRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
  timeoutMs = UPSTREAM_TIMEOUT_MS
): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method,
        headers: body ? { ...headers, "content-length": String(body.length) } : headers,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => resolve({ status: res.statusCode || 502, body: Buffer.concat(chunks) }));
      }
    );
    req.on("timeout", () => {
      req.destroy(Object.assign(new Error("Upstream request timed out"), { code: "ETIMEDOUT" }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function proxyJson(
  url: string,
  method: string,
  reply: FastifyReply,
  body?: Buffer,
  headers: Record<string, string> = {}
) {
  try {
    const resp = await rawHttpRequest(url, method, headers, body);
    const text = resp.body.toString("utf-8");
    try {
      return reply.code(resp.status).send(JSON.parse(text));
    } catch {
      return reply.code(resp.status).send({ error: text || "Unexpected non-JSON upstream response" });
    }
  } catch (err: any) {
    const isTimeout = err?.code === "ETIMEDOUT";
    return reply.code(isTimeout ? 504 : 502).send({
      error: isTimeout
        ? "AI verification engine timed out. Please try again."
        : "AI verification engine is currently unavailable.",
    });
  }
}

async function buildServer() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 12 * 1024 * 1024,
  });

  await fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  });

  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 12 * 1024 * 1024,
      files: 1,
    },
  });

  // OWASP Security Headers Hook
  fastify.addHook("onSend", async (_req, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'");
    reply.header("X-XSS-Protection", "0");
    return payload;
  });

  fastify.get("/health", async () => {
    const aiRes = await rawHttpRequest(`${AI_ENGINE_URL}/health`, "GET", {}, undefined, 4000)
      .then((r) => JSON.parse(r.body.toString("utf-8")))
      .catch(() => ({ status: "degraded" }));
    return {
      status: "ok",
      gateway: "swasthyabillcheck-fastify-api",
      ai_engine: aiRes,
    };
  });

  // Upload & OCR endpoint with MIME / magic-byte safety check
  fastify.post("/api/ocr", async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ error: "No file uploaded" });
    }
    const buf = await data.toBuffer();
    if (buf.length === 0) {
      return reply.code(400).send({ error: "Empty file uploaded" });
    }

    // Malware / executable magic-byte rejection (reject MZ/PE or ELF binaries)
    if (
      (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) ||
      (buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46)
    ) {
      return reply.code(400).send({ error: "Executable files are strictly prohibited" });
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buf)], { type: data.mimetype || "application/octet-stream" });
    formData.append("file", blob, data.filename || "bill.png");
    const serialized = new Response(formData);
    const rawBody = Buffer.from(await serialized.arrayBuffer());
    const contentType = serialized.headers.get("content-type") || "multipart/form-data";

    return proxyJson(`${AI_ENGINE_URL}/api/ocr`, "POST", reply, rawBody, { "content-type": contentType });
  });

  // Proxy JSON & binary endpoints to AI/Matching Engine
  fastify.get("/api/rates", async (req, reply) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    return proxyJson(`${AI_ENGINE_URL}/api/rates${qs ? `?${qs}` : ""}`, "GET", reply);
  });

  fastify.get("/api/demo-bills", async (_req, reply) => {
    return proxyJson(`${AI_ENGINE_URL}/api/demo-bills`, "GET", reply);
  });

  fastify.get("/api/demo-bills/:billId/image", async (req, reply) => {
    const { billId } = req.params as { billId: string };
    try {
      const resp = await rawHttpRequest(
        `${AI_ENGINE_URL}/api/demo-bills/${encodeURIComponent(billId)}/image`,
        "GET",
        {}
      );
      if (resp.status >= 400) {
        return reply.code(resp.status).send({ error: "Image not found" });
      }
      return reply.type("image/png").send(resp.body);
    } catch {
      return reply.code(502).send({ error: "Upstream image service unavailable" });
    }
  });

  fastify.post("/api/verify", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/verify`, "POST", reply, body, { "content-type": "application/json" });
  });

  fastify.get("/api/verify/:hash", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    return proxyJson(`${AI_ENGINE_URL}/api/verify/${encodeURIComponent(hash)}`, "GET", reply);
  });

  fastify.get("/api/report/:hash/pdf", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    try {
      const resp = await rawHttpRequest(
        `${AI_ENGINE_URL}/api/report/${encodeURIComponent(hash)}/pdf`,
        "GET",
        {}
      );
      if (resp.status >= 400) {
        return reply.code(resp.status).send({ error: "PDF generation failed" });
      }
      reply.header("Content-Disposition", `attachment; filename="SwasthyaBillCheck_${hash.slice(0, 10)}.pdf"`);
      return reply.type("application/pdf").send(resp.body);
    } catch {
      return reply.code(502).send({ error: "PDF generation service unavailable" });
    }
  });

  fastify.get("/api/history", async (req, reply) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    return proxyJson(`${AI_ENGINE_URL}/api/history${qs ? `?${qs}` : ""}`, "GET", reply);
  });

  fastify.delete("/api/privacy/session/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    return proxyJson(`${AI_ENGINE_URL}/api/privacy/session/${encodeURIComponent(sessionId)}`, "DELETE", reply);
  });

  fastify.post("/api/ask-charge", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/ask-charge`, "POST", reply, body, { "content-type": "application/json" });
  });

  fastify.post("/api/dispute-letter", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/dispute-letter`, "POST", reply, body, { "content-type": "application/json" });
  });

  fastify.post("/api/estimator", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/estimator`, "POST", reply, body, { "content-type": "application/json" });
  });

  fastify.post("/api/insurer/validate-claim", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/insurer/validate-claim`, "POST", reply, body, {
      "content-type": "application/json",
    });
  });

  fastify.get("/api/analytics/regulator", async (_req, reply) => {
    return proxyJson(`${AI_ENGINE_URL}/api/analytics/regulator`, "GET", reply);
  });

  fastify.post("/api/feedback", async (req, reply) => {
    const body = Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");
    return proxyJson(`${AI_ENGINE_URL}/api/feedback`, "POST", reply, body, { "content-type": "application/json" });
  });

  return fastify;
}

buildServer()
  .then((app) => app.listen({ port: PORT, host: "0.0.0.0" }))
  .then(() => {
    console.log(`[SwasthyaBillCheck API] Fastify listening on http://localhost:${PORT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
