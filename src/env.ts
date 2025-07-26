import 'dotenv/config';
import { z } from 'zod/v4-mini';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'testing']),
  PORT: z.coerce.number(),

  OLLAMA_BASE_URL: z.string(),

  NEO4J_USER: z.string(),
  NEO4J_PASSWORD: z.string(),
  NEO4J_URI: z.string(),
  NEO4J_DATABASE: z.string(),
  NEO4J_VECTOR_THRESHOLD: z.coerce.number(),

  NLP_MODEL: z.string(),
  CODER_MODEL: z.string(),
});

export const env = envSchema.parse(process.env);
