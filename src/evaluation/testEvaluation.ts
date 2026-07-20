import assert from "assert";
import { evaluateDecision } from "./evaluateDecision";
import { evaluationFixture } from "../fixtures/evaluationFixture";

const report = evaluateDecision(evaluationFixture, "NO_TRADE", ["SHORT"]);

console.log("\nEvaluation report:");
console.log(report);

assert.equal(report.verdict, "flat");
assert.equal(report.bestAvailablePosition, "SHORT");
assert.ok(report.decisionRegretPct > 0);
