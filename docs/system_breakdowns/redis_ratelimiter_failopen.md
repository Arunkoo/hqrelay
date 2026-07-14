# Fail-Open Availability Pattern in the Redis Rate Limiter

**Status:** Implemented · **Category:** Availability / Defense-in-depth · **Component:** `apps/receiver/src/middleware/rateLimiter.ts`

---

## Architecture

![Redis rate limiter fail-open availability](../architecture_diagrams/redis_ratelimiter_failopen.png)

---

## Summary

The receiver's rate limiter depends on Redis to track request counts per project (sliding window,
`ZADD` + `ZCARD`). If Redis itself goes down, a naive implementation has two bad options: block
every request until Redis recovers (kills availability for legitimate customers), or silently skip
the check with no visibility into what happened (hides a real operational problem). HQRelay does
neither — it **fails open**, and the reasoning behind that choice is worth writing down, because it
only holds because of what else the system already guarantees.

---

## The Core Trade-off

Every dependency a request path touches introduces the same question: **if this dependency dies,
should the request die with it, or should the system route around it?**

For rate limiting specifically, the two failure modes are asymmetric in cost:

- **Fail closed** (reject every request while Redis is down): Redis becomes a single point of
  failure for the _entire receiver_, not just the rate-limiting feature. A Redis blip that has
  nothing to do with request validity now takes down webhook ingestion completely. For a system
  whose entire value proposition is reliable delivery, this is the wrong trade — you'd be
  sacrificing core availability to protect a secondary safety feature.
- **Fail open** (let requests through, skip the check): Rate limiting is temporarily absent, which
  is a real cost — but the system keeps doing its actual job. The question that matters is: _what's
  still standing guard while rate limiting is down?_

HQRelay fails open, and the answer to that question is what makes it defensible rather than reckless.

---

## Why Fail-Open Is Safe Here (Not Just Convenient)

Rate limiting and HMAC signature verification solve **different problems**, and that separation is
what makes it acceptable to lose one without losing the other:

- **HMAC verification** answers: _is this request cryptographically legitimate_ — did it come from
  someone who holds the shared secret? This runs independently of Redis's rate-limit counters and
  is unaffected by the rate limiter's fail-open path.
- **Rate limiting** answers: _is this legitimate sender sending too much, too fast?_ It's a volume
  control, not an authenticity check.

When Redis is down and the rate limiter fails open, forged requests are **still rejected** by HMAC
— that check doesn't care whether Redis is reachable. What's actually lost during a Redis outage is
narrower than it first sounds: protection against a _legitimate, authenticated_ sender sending
requests unusually fast. That's a real gap, but it's a much smaller blast radius than "anyone can
send anything," which is what you'd have if there were no second layer at all.

This is the general shape of defense-in-depth: each layer should fail independently, and the system
should stay meaningfully protected even when one layer is down — not perfectly protected, but not
wide open either.

---

## The Code

```typescript
try {
  const isInvalidReq = await isRateLimited(projectId);

  if (isInvalidReq) {
    req.logger?.warn({ projectId }, "429 Too many frequent request");
    return res.status(429).json({ message: "Too many frequent request" });
  }

  next();
} catch (error) {
  req.logger?.error({ err: error }, "redis service is down");
  return next(); // fail-open: system stays available if Redis down; HMAC is second defense layer
}
```

Two deliberate decisions live in this small block:

**1. The catch block calls `next()`, not a 5xx response.**
A naive instinct is to treat any unexpected error as "something's broken, reject the request." But
rejecting here means Redis's health now gates whether _any_ webhook gets processed — the opposite
of what a fault-tolerant relay is supposed to do. `next()` says: this specific safety check
couldn't run, but nothing about that failure means the request itself is invalid, so let it continue
into the layers that can still evaluate it.

**2. The catch block logs at `error`, not `warn` or silently.**
Fail-open without logging is the dangerous version of this pattern — the system keeps running with
zero rate-limit protection and nobody knows. The `error` level (as opposed to the `warn` used for a
normal 429 hit) reflects that this is a different kind of event: not expected traffic shaping, but
an infrastructure dependency being unreachable. That distinction should be loud enough to page
someone eventually, once alerting is wired on top of these logs (planned, not yet built).

---

## What This Pattern Is _Not_

Worth being explicit about the limits, same as the RabbitMQ postmortem was explicit about what
wasn't yet tested:

- This is not "ignore errors and hope." The error is logged with full context (`{ err: error }`,
  structured, carrying `correlationId`) specifically so it's investigable after the fact.
- This is not a substitute for actually fixing Redis if it goes down. Fail-open buys time and
  availability during an outage; it doesn't mean Redis health stops mattering.
- This is not applied uniformly across the system. Idempotency checks, for example, do **not**
  fail open the same way — a duplicate-detection failure has different consequences (double
  delivery to a customer's endpoint) than a rate-limit-detection failure (a burst of legitimate
  traffic getting through unthrottled). Each dependency gets its own fail-open-vs-fail-closed
  decision based on what's actually at stake if the check is skipped — there's no single rule that
  covers every case.

---

## What I'd Still Want to Test

- Behavior under _sustained_ Redis unavailability (minutes, not a single blip) — does log volume
  from repeated `error` calls become a problem in itself, and does anything downstream (alerting,
  dashboards) actually notice and escalate this the way it should?
- Whether a burst of traffic arriving specifically _during_ a Redis outage (an attacker timing
  their spam to a known Redis maintenance window, for instance) is a realistic threat model worth
  designing against, or a low-probability edge case not worth the added complexity right now.

Naming these rather than claiming the pattern is fully hardened — same principle as keeping the
RabbitMQ postmortem's "what I'd still want to test" section honest about scope.

---

[← Back to main README](../../readme.md)
