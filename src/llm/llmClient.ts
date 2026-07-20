import OpenAI from "openai";
import { env } from "../config/env";

export const llmClient = new OpenAI({
  apiKey: env.LLM_API_KEY,
  baseURL: env.LLM_BASE_URL,
});
