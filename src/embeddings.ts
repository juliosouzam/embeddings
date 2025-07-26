import ollama from 'ollama';

export const embeddings = async ({ text }: { text: string }) => {
  try {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text',
      prompt: text,
    });
    return response;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};
