import type { LlmMessage } from "../domain/llm";

export function toApiMessage(message: LlmMessage) {
  if (message.role === "system") {
    return {
      role: "system" as const,
      content: message.content,
    };
  }

  if (message.role === "user") {
    return {
      role: "user" as const,
      content: message.content,
    };
  }

  return {
    role: "assistant" as const,
    content: message.content,
  };
}
