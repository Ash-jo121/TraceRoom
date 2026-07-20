import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),

  LLM_PROVIDER: z.string().min(1),
  LLM_INPUT_COST_PER_1M_USD: z.coerce.number().nonnegative(),
  LLM_CACHED_INPUT_COST_PER_1M_USD: z.coerce.number().nonnegative(),
  LLM_OUTPUT_COST_PER_1M_USD: z.coerce.number().nonnegative(),
  LLM_PRICING_VERSION: z.string().min(1),
});

export const env = EnvSchema.parse(process.env);
