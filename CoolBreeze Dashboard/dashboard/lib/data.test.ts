import test from "node:test";
import assert from "node:assert/strict";
import {
  demoData,
  metrics,
  filterLeads,
  formatDate,
  snapshotSchema,
} from "./data";
import { HttpAdapter } from "./adapter";
test("fixture validates and bookings resolve to real sample leads", () => {
  assert.ok(snapshotSchema.safeParse(demoData).success);
  for (const b of demoData.bookings)
    assert.ok(demoData.leads.some((l) => l.id === b.leadId));
});
test("KPIs use actual lead data and exclude unanswered leads from average", () => {
  assert.deepEqual(metrics(demoData.leads), {
    total: 12,
    average: 24,
    booked: 5,
    conversion: 42,
  });
  assert.deepEqual(metrics([]), {
    total: 0,
    average: null,
    booked: 0,
    conversion: 0,
  });
});
test("search combines name/service/city with status and priority", () => {
  assert.equal(
    filterLeads(demoData.leads, "emma", "Needs attention", "Urgent").length,
    1,
  );
  assert.equal(
    filterLeads(demoData.leads, "emma", "Booked", "Urgent").length,
    0,
  );
  assert.equal(
    filterLeads(demoData.leads, "zzzz", "All statuses", "All priorities")
      .length,
    0,
  );
});
test("Dallas times respect daylight saving transitions regardless of host timezone", () => {
  assert.match(
    formatDate("2026-10-19T14:00:00Z", { hour: "numeric", minute: "2-digit" }),
    /9:00 AM/,
  );
  assert.match(
    formatDate("2026-12-19T14:00:00Z", { hour: "numeric", minute: "2-digit" }),
    /8:00 AM/,
  );
});
test("HTTP adapter rejects unavailable backend without substituting demo data", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 503 });
  try {
    await assert.rejects(
      new HttpAdapter(
        "https://example.com/dashboard",
        async () => "test",
      ).load(),
      /503/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("HTTP adapter validates backend response", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ bad: true });
  try {
    await assert.rejects(
      new HttpAdapter(
        "https://example.com/dashboard",
        async () => "test",
      ).load(),
    );
  } finally {
    globalThis.fetch = original;
  }
});
