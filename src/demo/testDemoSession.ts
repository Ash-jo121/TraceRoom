import assert from "node:assert/strict";
import { buildProofPack } from "./proofPack";
import { runDemoSession } from "./runDemoSession";
import { telemetrySdk } from "../telemetry/tracing";

try {
  const healthy = await runDemoSession("healthy");
  assert.equal(healthy.outcome, "EXECUTED");
  assert.equal(healthy.execution.status, "EXECUTED");
  assert.equal(healthy.evidenceIntegrity.status, "PASS");

  const fault = await runDemoSession("fault");
  assert.equal(fault.outcome, "VETOED_BLOCKED");
  assert.equal(fault.execution.status, "BLOCKED");
  assert.equal(fault.evidenceIntegrity.status, "CRITICAL");
  assert.equal(fault.riskReview.failedRules.includes("EVIDENCE_INTEGRITY"), true);

  const momentumClaim = fault.proposals[0]?.evidence[0];
  assert.equal(momentumClaim?.citedPrice, 1819.26);
  assert.equal(momentumClaim?.authoritativePrice, 1684.5);
  assert.equal(momentumClaim?.deviationPercent, 8);
  assert.equal(momentumClaim?.tolerancePercent, 2);

  const pack = await buildProofPack(fault);
  assert.equal(pack.markdown.includes("EVIDENCE_INTEGRITY"), true);
  assert.equal(pack.markdown.includes("No real-money trading"), true);

  console.log("TraceRoom demo tests passed");
} finally {
  await telemetrySdk.shutdown();
}
