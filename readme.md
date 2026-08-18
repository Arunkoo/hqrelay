<div align="center">

# HQRelay

**Fault-tolerant webhook relay engine for Indian B2B startups**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.x-FF6600?style=flat&logo=rabbitmq&logoColor=white)](https://rabbitmq.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat&logo=redis&logoColor=white)](https://upstash.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## The Problem

Your startup integrates with Razorpay, Shiprocket, Exotel — maybe all three.

Each of them sends **webhooks**: HTTP POST requests fired the moment something happens. Payment captured. Order shipped. Call ended.

Here's the catch: **if your server is down when that webhook arrives, it's gone forever.**

No retry. No queue. No second chance. Razorpay tried, got no response, moved on.

```
Razorpay fires webhook at 2:00 AM
Your server is restarting (deployment)
Razorpay gets no response
Payment event = silently lost
Your customer's order = never processed
```

This is a real failure mode that real companies hit. At scale — a flash sale, a traffic spike — it gets worse.

---

## What HQRelay Does

HQRelay sits between your upstream providers (Razorpay, Shiprocket, etc.) and your own servers.

```
Razorpay ──→ HQRelay Receiver ──→ RabbitMQ Queue ──→ HQRelay Worker ──→ Your Server
               (catches it)         (holds it safe)      (delivers it)
```

Instead of firing directly at your server, providers fire at HQRelay. HQRelay:

1. **Catches** the webhook instantly — responds `202 Accepted` in under 100ms
2. **Queues** it durably in RabbitMQ — survives crashes, restarts, broker blips
3. **Delivers** it to your server with full retry logic
4. **Retries** on failure — 5s → 30s → 5min → 30min → 1hr exponential backoff
5. **Logs** every attempt to Postgres — full audit trail, forever

Your server can be down for an hour. HQRelay will keep trying. When you come back, everything delivers.

---

## Architecture Overview

**Two independent processes. One shared brain.**

![HQRelay Architecture](docs/architecture_diagrams/HLD_OF_HQRELAY.png)

**Why two processes?** If the worker crashes (slow delivery, network hang), the receiver keeps running. Razorpay always gets its `202`. Independent failure, independent scaling.

---

## Design Decisions

Short version of the stuff that took real thinking. Deep dives linked where I wrote them up separately.

**HMAC verification** — every webhook is checked against `hmac(secret, rawBody)` before it touches the queue. Has to be the raw request bytes, not the re-parsed JSON, or the signature won't match.

**Idempotency** — providers retry webhooks, so the same event can arrive 2-3 times. Each `webhookId` gets a Redis key (24hr TTL); duplicates get acked but not re-queued. Publish to RabbitMQ happens _before_ marking it seen in Redis — if that order flips, a crash between the two writes loses the event for good.

**Sliding window rate limiter** — fixed windows can be gamed by bursting right across a window boundary, so this uses a Redis sorted set per `projectId` instead of per-IP (all webhooks come from the provider's IP, so per-IP would block every customer at once). Fails **open** if Redis is down — HMAC is still checking every request, so availability wins over strict enforcement here.

> [Why fail-open is the right call here →](docs/system_breakdowns/redis_ratelimiter_failopen.md)

**Project config caching** — HMAC needs each project's secret, and hitting Postgres on every single webhook doesn't scale. Cache-aside in Redis, 5 min TTL — long enough to matter, short enough that a rotated secret doesn't break things for hours.

**Exponential backoff via delay queues** — no `setTimeout` in the worker, since sleeping blocks the process. Instead, 5 RabbitMQ queues with TTLs (5s/30s/5min/30min/1hr) that dead-letter back into the main queue when they expire. Worker stays free the whole wait.

**Full audit trail** — every delivery attempt (status code, latency, attempt number) lands in Postgres, plus a separate `webhook_logs` table for the receiver side. Both append-only.

> [A silent message-loss bug I found in RabbitMQ connection recovery →](docs/debugging_notes/stale_channel_recovery.md)

**Correlation IDs + structured logging** — every request gets an ID at the receiver's edge that follows it through HMAC → rate limiter → service layer → (via RabbitMQ message properties, not the payload) → worker delivery/retry. One `correlationId`, one grep, full story of a webhook's life.

**Health checks that actually check something** — `/health` doesn't just confirm the process is alive, it pings Postgres, Redis, and RabbitMQ directly, with timeouts. Postgres/RabbitMQ down → `503 down` (critical). Redis down → `503 degraded` (things still mostly work). Tested by actually killing each container and watching the response change.

---

## Tech Stack

<table>
  <tr>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=nodejs" width="48" height="48" alt="Node.js"/><br/>
      <b>Node.js 20</b><br/>
      <sub>Runtime</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript"/><br/>
      <b>TypeScript</b><br/>
      <sub>Language</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=express" width="48" height="48" alt="Express"/><br/>
      <b>Express.js</b><br/>
      <sub>Web Framework</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=rabbitmq" width="48" height="48" alt="RabbitMQ"/><br/>
      <b>RabbitMQ</b><br/>
      <sub>Message Queue</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=postgres" width="48" height="48" alt="PostgreSQL"/><br/>
      <b>PostgreSQL</b><br/>
      <sub>Database (Neon)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=redis" width="48" height="48" alt="Redis"/><br/>
      <b>Redis</b><br/>
      <sub>Cache (Upstash)</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=docker" width="48" height="48" alt="Docker"/><br/>
      <b>Docker</b><br/>
      <sub>Containerization</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=aws" width="48" height="48" alt="AWS"/><br/>
      <b>AWS EC2</b><br/>
      <sub>Deployment</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=github" width="48" height="48" alt="GitHub Actions"/><br/>
      <b>GitHub Actions</b><br/>
      <sub>CI/CD</sub>
    </td>
    <td align="center" width="130">
      <img src="https://skillicons.dev/icons?i=nginx" width="48" height="48" alt="Nginx"/><br/>
      <b>Nginx</b><br/>
      <sub>Reverse Proxy</sub>
    </td>
  </tr>
</table>

> **Also uses:** Drizzle ORM (type-safe schema-as-code), ioredis (persistent TCP client), Pino (structured JSON logging), Prometheus + Grafana (planned)

---

## Project Structure

```
hqrelay/
├── apps/
│   ├── receiver/                  ← Accepts webhooks, queues them
│   │   └── src/
│   │       ├── index.ts           ← Express entrypoint (dotenv FIRST)
│   │       ├── routes/            ← URL + method only
│   │       ├── controllers/       ← Request/response only
│   │       ├── services/          ← Business logic (queueWebhook)
│   │       └── middleware/        ← rateLimiter, hmacValidator, correlationId
│   │
│   └── worker/                    ← Delivers webhooks, handles retries
│       └── src/
│           ├── index.ts
│           ├── consumeQueue.ts    ← RabbitMQ consumer, ack/nack logic
│           ├── deliverJob.ts      ← HTTP delivery, returns typed result
│           └── retryWithBackoff.ts ← Routes to delay queue by attempt
│
└── packages/
    └── shared/                    ← Imported by both apps
        └── src/
            ├── db/                ← Drizzle client, schema, migrations
            ├── cache/             ← Redis client, idempotency, rate limiter
            ├── queue/             ← RabbitMQ connection, publish, liveness check
            ├── health/            ← Deep health check (DB/Redis/RabbitMQ probes)
            ├── logger/            ← Pino base logger, child logger types
            └── repositories/      ← DB access layer (projects, endpoints, delivery)
```

**Conventions enforced:**

- `dotenv.config()` is always the first line of every entrypoint
- Repository layer = DB access only, zero business logic
- UUID primary keys everywhere
- `ON DELETE RESTRICT` on all audit-trail foreign keys
- pgEnum for all fixed-set status fields
- Redis namespace prefix `hqrelay:` on every key to prevent collisions
- Structured logging via `req.logger` / child loggers, no bare `console.log` in request paths

---

## API

### Receive a Webhook

```
POST /v1/webhooks/:projectId
```

**Headers required:**

```
Content-Type: application/json
X-Hub-Signature-256: sha256=<hmac_signature>
X-Webhook-Id: <idempotency_key>         (optional — sha256 fallback if absent)
```

**Response:**

```
202 Accepted   → queued for delivery
400            → missing projectId or malformed request
401            → invalid HMAC signature or unknown project
429            → rate limit exceeded (100 req/min per project)
500            → internal error (RabbitMQ down, DB unreachable)
```

Responds in under 100ms. Delivery happens asynchronously.

### Health Check

```
GET /health
```

```json
200 { "status": "ok",       "checks": { "postgres": "ok", "redis": "ok",       "rabbitMq": "ok" } }
503 { "status": "degraded", "checks": { "postgres": "ok", "redis": "down",     "rabbitMq": "ok" } }
503 { "status": "down",     "checks": { "postgres": "down", "redis": "ok",     "rabbitMq": "ok" } }
```

Redis down → `degraded` (non-critical). Postgres or RabbitMQ down → `down` (critical).

---

## Getting Started (Local)

**Prerequisites:** Node.js 20+, Docker, npm

```bash
# Clone
git clone https://github.com/Arunkoo/hqrelay.git
cd hqrelay

# Install all workspace dependencies
npm install

# Start RabbitMQ
docker compose up -d

# Copy and fill environment variables
cp apps/receiver/.env.example apps/receiver/.env
cp apps/worker/.env.example apps/worker/.env
```

**Required environment variables:**

```env
# Postgres (Neon)
DATABASE_URL=postgresql://...

# Redis (Upstash)
REDIS_URL=rediss://...

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
```

```bash
# Run migrations
cd packages/shared
npx drizzle-kit migrate

# Start receiver (terminal 1)
cd apps/receiver
npm run dev

# Start worker (terminal 2)
cd apps/worker
npm run dev
```

Receiver runs on `http://localhost:3000`. RabbitMQ management UI at `http://localhost:15672`.

---

## Database Schema

```
projects          → one row per customer (stores HMAC secret)
    │
    └── endpoints → one row per target URL per project
            │
            └── delivery_attempts → one row per delivery attempt
                                    (status_code, latency_ms, attempt_num)

webhook_logs      → receiver-side log (queued / duplicate / failed-to-queue)
                    logged before RabbitMQ, separate from delivery_attempts
```

`delivery_attempts` and `webhook_logs` are append-only. No deletes, no updates. Complete history of every event from the moment it arrived.

---

## Reliability Guarantees

| Scenario                             | Behavior                                                              |
| ------------------------------------ | --------------------------------------------------------------------- |
| Customer server is down              | Retries for up to ~2 hours (5 attempts, exponential backoff)          |
| HQRelay receiver crashes mid-request | RabbitMQ message unacked → requeued automatically                     |
| RabbitMQ restarts                    | Durable queues + persistent messages → nothing lost                   |
| Duplicate webhook from provider      | Idempotency check → acknowledged, not re-queued                       |
| Redis goes down                      | Rate limiter fails open; HMAC still validates all requests            |
| Postgres or RabbitMQ goes down       | `/health` reports `down` (503) — surfaces before it's a 2 AM incident |
| Unknown project ID                   | 401 (not 404 — avoids leaking internal ID structure)                  |
| Webhook exhausts all retries         | Moves to dead-letter queue (consumer + alert — roadmap)               |

---

## Roadmap

### Week 3 — Observability

- [x] Pino structured logging with correlation IDs, end-to-end across receiver + worker
- [x] Deep health check endpoint (Postgres/Redis/RabbitMQ probes, degraded vs down contract), live-tested against all three dependency-down scenarios
- [ ] Prometheus `/metrics` on receiver + worker
- [ ] Grafana dashboard (queue depth, delivery rate, retry rate, latency)
- [ ] Nginx reverse proxy with SSL
- [ ] SSE — realtime delivery status
- [ ] GitHub Actions CI/CD → AWS EC2
- [ ] All services in Docker Compose

### Week 4 — AI Layer + Portfolio Polish

- [ ] `GET /v1/dashboard/insights/:projectId` — Claude API analyzes failure patterns, surfaces anomalies in plain English
- [ ] Postman collection (all endpoints, example payloads)
- [ ] k6 load test — 1000 req/sec sustained
- [ ] EC2 deployment live

### v2 Features (Post-MVP)

- [ ] Transactional Outbox Pattern — atomic dual-write (Postgres + RabbitMQ)
- [ ] Dead-letter consumer + customer alert (email / webhook callback)
- [ ] Multi-endpoint routing by event type (`payment.*` → endpoint A, `order.*` → endpoint B)
- [ ] Tiered rate limits (100/min default, 1000/min enterprise)
- [ ] Customer dashboard (delivery status, retry history, failure alerts)

---

## What I Learned Building This

**Atomicity across two systems is harder than it sounds.** Logging to Postgres and publishing to RabbitMQ are two separate writes — there's no built-in way to make them succeed or fail together. I'm currently leaning on idempotency + at-least-once delivery to paper over that gap, which works but isn't the "correct" answer. The Transactional Outbox Pattern is the real fix, and it's next on my list to actually build, not just read about.

**Most of my design questions were "what happens when this breaks," not "does this work."** Redis dies mid-request. RabbitMQ restarts. The worker crashes half-way through a retry. A provider fires the same webhook three times because we were slow to ack. Every one of those needed an actual answer before I trusted the system, not just a happy-path test.

**Splitting receiver and worker into separate processes was the right call.** The receiver's whole job is: verify, dedupe, queue, respond in under 100ms. It doesn't care what happens after that. The worker owns retries and delivery. Neither knows the other exists — they only share a queue. That decoupling is what let me build the health checks and logging separately for each without them stepping on each other.

**Observability isn't something you add at the end.** I built the correlation ID at the request's entry point on purpose, before the logging even existed, so it'd already be there to thread through everything later. Health checks came the same way — actually pinging Postgres/Redis/RabbitMQ instead of just returning 200 if the process is alive, because a fake-healthy check is worse than no check at all.

---

## Author

**Arun** — Backend Engineering (Fresher)

Learning by building the kind of infra I'd actually want to work on.

[GitHub](https://github.com/Arunkoo) · [LinkedIn](https://www.linkedin.com/in/arunkoo/)

---

<div align="center">
<sub>HQRelay — a work in progress, updated as I build it.</sub>
</div>
