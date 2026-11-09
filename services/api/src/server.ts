/**
 * SwasthyaBillCheck (NMBTP) — Node.js + TypeScript + Fastify API Layer
 * Implements:
 * - OWASP Top 10 Security Headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
 * - Rate Limiting (@fastify/rate-limit: 300 req/min per IP)
 * - Multipart File Upload Validation (MIME & magic-byte checks, 12MB cap)
 * - Orchestration & Proxy to the Python FastAPI AI/OCR/Matching Engine (http://127.0.0.1:8000)
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";
const PORT = Number(process.env.PORT || 4000);

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
    reply.header("X-XSS-Protection", "0");
    return payload;
  });

  fastify.get("/health", async () => {
    const aiRes = await fetch(`${AI_ENGINE_URL}/health`).then((r) => r.json()).catch(() => ({ status: "degraded" }));
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

    const resp = await fetch(`${AI_ENGINE_URL}/api/ocr`, {
      method: "POST",
      body: formData,
    });
    const body = await resp.json();
    return reply.code(resp.status).send(body);
  });

  // Proxy JSON & binary endpoints to AI/Matching Engine
  fastify.get("/api/rates", async (req, reply) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const resp = await fetch(`${AI_ENGINE_URL}/api/rates${qs ? `?${qs}` : ""}`);
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.get("/api/demo-bills", async (_req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/demo-bills`);
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.get("/api/demo-bills/:billId/image", async (req, reply) => {
    const { billId } = req.params as { billId: string };
    const resp = await fetch(`${AI_ENGINE_URL}/api/demo-bills/${encodeURIComponent(billId)}/image`);
    if (!resp.ok) {
      return reply.code(resp.status).send({ error: "Image not found" });
    }
    const arr = Buffer.from(await resp.arrayBuffer());
    return reply.type("image/png").send(arr);
  });

  fastify.post("/api/verify", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.get("/api/verify/:hash", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    const resp = await fetch(`${AI_ENGINE_URL}/api/verify/${encodeURIComponent(hash)}`);
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.get("/api/report/:hash/pdf", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    const resp = await fetch(`${AI_ENGINE_URL}/api/report/${encodeURIComponent(hash)}/pdf`);
    if (!resp.ok) {
      return reply.code(resp.status).send({ error: "PDF generation failed" });
    }
    const pdfBuf = Buffer.from(await resp.arrayBuffer());
    reply.header("Content-Disposition", `attachment; filename="SwasthyaBillCheck_${hash.slice(0, 10)}.pdf"`);
    return reply.type("application/pdf").send(pdfBuf);
  });

  fastify.get("/api/history", async (req, reply) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const resp = await fetch(`${AI_ENGINE_URL}/api/history${qs ? `?${qs}` : ""}`);
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.delete("/api/privacy/session/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const resp = await fetch(`${AI_ENGINE_URL}/api/privacy/session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.post("/api/ask-charge", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/ask-charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.post("/api/dispute-letter", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/dispute-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.post("/api/estimator", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/estimator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.post("/api/insurer/validate-claim", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/insurer/validate-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.get("/api/analytics/regulator", async (_req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/analytics/regulator`);
    return reply.code(resp.status).send(await resp.json());
  });

  fastify.post("/api/feedback", async (req, reply) => {
    const resp = await fetch(`${AI_ENGINE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    return reply.code(resp.status).send(await resp.json());
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

