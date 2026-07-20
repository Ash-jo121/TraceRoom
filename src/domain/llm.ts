export type MessageRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: MessageRole;
  content: string;
}
