import Fastify from 'fastify';
import z from 'zod';
import { chat } from './chat';
import { embeddings } from './embeddings';
import { env } from './env';

const server = Fastify({
  logger: true,
});

server.get('/', async () => {
  return { message: `it's working!` };
});

const embeddingsSchema = z.object({
  text: z.string(),
});

server.post('/embeddings', async (request) => {
  const { text } = embeddingsSchema.parse(request.body);
  const result = await embeddings({ text });

  const chatResponse = await chat({ text });

  return { embeddings: result.embedding, chat: chatResponse.content };
});

async function main() {
  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    await server.close();
    server.log.error(err);
    process.exit(1);
  }
}

await main();
