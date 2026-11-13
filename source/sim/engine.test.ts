import assert from "node:assert/strict";
import { test } from "node:test";
import { SimulationEngine } from "./engine.ts";

test("books stay coherent and spend never exceeds budget", () => {
  const engine = new SimulationEngine(() => 0.62);
  engine.updateSettings({
    productBatch: 2,
    maxLiveCampaigns: 3,
    budgetPerCampaign: 100,
    risk: 0.3,
    targetRoas: 2,
    autoApproveBudget: 500,
    campaignBeats: 8,
    debugOutcome: "win",
  });
  engine.startAll({ timer: false });
  for (let i = 0; i < 36; i++) engine.pump();
  const snap = engine.snapshot();
  assert.equal(engine.booksOk(), true);
  assert.ok(snap.products.length >= 1);
  for (const campaign of snap.campaigns) {
    assert.ok(campaign.spent <= campaign.budget + 0.02);
  }
  const ad = snap.campaigns.reduce((sum, c) => sum + c.spent, 0);
  assert.ok(Math.abs(ad - snap.adSpend) < 0.05);
  engine.dispose();
});

test("kill freezes spend and approvals are unique", () => {
  const engine = new SimulationEngine(() => 0.8);
  engine.updateSettings({
    productBatch: 1,
    maxLiveCampaigns: 2,
    budgetPerCampaign: 80,
    campaignBeats: 14,
    autoApproveBudget: 500,
    targetRoas: 3,
    debugOutcome: "lose",
  });
  engine.startAll({ timer: false });
  for (let i = 0; i < 45; i++) engine.pump();
  const pending = engine.snapshot().approvals.filter((a) => a.type === "kill");
  assert.ok(pending.length >= 1, "expected a kill approval");
  const ids = pending.map((a) => `${a.type}:${a.campaignId}`);
  assert.equal(new Set(ids).size, ids.length);
  const approval = pending[0]!;
  const before = engine.snapshot().campaigns.find((c) => c.id === approval.campaignId)!;
  engine.approve(approval.id, true);
  const killed = engine.snapshot().campaigns.find((c) => c.id === approval.campaignId)!;
  assert.equal(killed.status, "KILLED");
  const spent = killed.spent;
  for (let i = 0; i < 6; i++) engine.pump();
  const after = engine.snapshot().campaigns.find((c) => c.id === approval.campaignId)!;
  assert.equal(after.spent, spent);
  assert.ok(before.spent >= 0);
  assert.equal(engine.booksOk(), true);
  engine.dispose();
});

test("scale increases budget once", () => {
  const engine = new SimulationEngine(() => 0.85);
  engine.updateSettings({
    productBatch: 1,
    budgetPerCampaign: 100,
    campaignBeats: 14,
    autoApproveBudget: 500,
    targetRoas: 1.3,
    debugOutcome: "win",
  });
  engine.startAll({ timer: false });
  for (let i = 0; i < 45; i++) engine.pump();
  const approval = engine.snapshot().approvals.find((a) => a.type === "scale");
  assert.ok(approval, "expected a scale approval");
  const before = engine.snapshot().campaigns.find((c) => c.id === approval!.campaignId)!.budget;
  engine.approve(approval!.id, true);
  engine.approve(approval!.id, true);
  const after = engine.snapshot().campaigns.find((c) => c.id === approval!.campaignId)!;
  assert.equal(after.status, "SCALED");
  assert.ok(after.budget > before);
  assert.equal(engine.booksOk(), true);
  engine.dispose();
});

test("reset and capital guard", () => {
  const engine = new SimulationEngine(() => 0.5);
  assert.equal(engine.setCapital(5000), true);
  engine.startAll({ timer: false });
  assert.equal(engine.setCapital(2000), false);
  engine.reset();
  const snap = engine.snapshot();
  assert.equal(snap.capital, 5000);
  assert.equal(snap.revenue, 0);
  assert.equal(snap.orders, 0);
  assert.equal(snap.running, false);
  engine.dispose();
});

test("import roundtrip keeps the ledger", () => {
  const engine = new SimulationEngine(() => 0.7);
  engine.updateSettings({ productBatch: 1, budgetPerCampaign: 90, autoApproveBudget: 500, debugOutcome: "win" });
  engine.startAll({ timer: false });
  for (let i = 0; i < 16; i++) engine.pump();
  const raw = engine.exportJson();
  const products = engine.snapshot().products.length;
  engine.reset();
  const imported = engine.importJson(raw);
  assert.equal(imported.ok, true);
  assert.equal(engine.snapshot().products.length, products);
  assert.equal(engine.booksOk(), true);
  assert.equal(engine.importJson("{").ok, false);
  engine.dispose();
});
