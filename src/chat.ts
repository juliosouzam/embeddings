import ollama from 'ollama';

export const chat = async ({ text }: { text: string }) => {
  try {
    const response = await ollama.chat({
      model: 'gemma3:1b',
      messages: [{ role: 'system', content: text }],
      stream: false,
    });
    return response.message;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
};
