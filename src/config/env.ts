import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),
});

export const env = EnvSchema.parse(process.env);
