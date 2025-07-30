import ollama from 'ollama';
import { env } from './env';

export const chat = async ({ text }: { text: string }) => {
  try {
    const response = await ollama.chat({
      model: env.NLP_MODEL,
      messages: [{ role: 'system', content: text }],
      stream: false,
    });
    return response.message;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
};
