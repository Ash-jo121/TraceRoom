import type { SessionScenario } from "../session/types";

export const EVIDENCE_FAULT_ENV_VALUE = "evidence-price-deviation";
export const RISK_VETO_ENV_VALUE = "risk-price-move-veto";
export const ERROR_ENV_VALUE = "workflow-recording-error";
export const DEADLOCK_ENV_VALUE = "consensus-deadlock";

const scenarios: readonly SessionScenario[] = [
  "healthy",
  "evidence-fault",
  "risk-veto",
  "error",
  "deadlock",
];

export function resolveSessionScenario(
  requested?: string | null,
): SessionScenario {
  if (requested && scenarios.includes(requested as SessionScenario)) {
    return requested as SessionScenario;
  }

  if (requested === "fault") {
    return "evidence-fault";
  }

  switch (process.env.TRACEROOM_SCENARIO) {
    case EVIDENCE_FAULT_ENV_VALUE:
      return "evidence-fault";
    case RISK_VETO_ENV_VALUE:
      return "risk-veto";
    case ERROR_ENV_VALUE:
      return "error";
    case DEADLOCK_ENV_VALUE:
      return "deadlock";
    default:
      return "healthy";
  }
}

export function scenarioEnvironmentValue(scenario: SessionScenario): string {
  switch (scenario) {
    case "evidence-fault":
      return EVIDENCE_FAULT_ENV_VALUE;
    case "risk-veto":
      return RISK_VETO_ENV_VALUE;
    case "error":
      return ERROR_ENV_VALUE;
    case "deadlock":
      return DEADLOCK_ENV_VALUE;
    case "healthy":
      return "normal";
  }
}
