import ollama from 'ollama';
import { env } from './env';

export const embeddings = async ({ text }: { text: string }) => {
  try {
    const response = await ollama.embeddings({
      model: env.EMBEDDING_MODEL,
      prompt: text,
    });
    return response;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};
