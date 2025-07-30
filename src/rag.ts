import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { GoogleCustomSearch } from '@langchain/community/tools/google_custom_search';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { env } from './env';

// ✅ Inicializa Modelos e Ferramentas
const model = new ChatOllama({
  temperature: 0,
  model: env.NLP_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
  keepAlive: '10m',
});

const ollamaEmbeddings = new OllamaEmbeddings({
  model: env.EMBEDDING_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
});

const searchTool = new GoogleCustomSearch({
  apiKey: env.GOOGLE_API_KEY,
  googleCSEId: env.GOOGLE_CSE_ID,
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// 1️⃣ Conecta-se ao índice vetorial existente no Neo4j
const neo4jVectorIndex = await Neo4jVectorStore.fromExistingIndex(
  ollamaEmbeddings,
  {
    url: env.NEO4J_URI,
    username: env.NEO4J_USER,
    password: env.NEO4J_PASSWORD,
    indexName: 'javascript_index',
    textNodeProperty: 'text',
  },
);

// ✅ Função para Responder Perguntas com Contexto Local e da Web
async function answerQuestionWithWebSearch(question: string) {
  console.log('STEP 1: Buscando URLs relevantes na web...');
  const searchResultString: string = await searchTool.invoke(question);

  // Extrai URLs do resultado da busca (pode precisar de ajuste dependendo do formato)
  const urls = searchResultString
    .split('\n')
    .map((line) => line.match(/https?:\/\/[^\s]+/))
    .filter((match) => match !== null)
    .map((match) => match[0]);

  if (urls.length === 0) {
    console.log('Nenhuma URL encontrada na busca.');
    return 'Não consegui encontrar fontes na web para responder a essa pergunta.';
  }

  console.log(`STEP 2: Carregando conteúdo de ${urls.length} URLs...`);
  const loadedWebDocs = [];
  for (const url of urls) {
    try {
      const loader = new CheerioWebBaseLoader(url);
      const docs = await loader.load();
      loadedWebDocs.push(...docs);
    } catch (e) {
      console.warn(`Aviso: Falha ao carregar a URL ${url}.`, e);
    }
  }

  if (loadedWebDocs.length === 0) {
    console.log('Nenhum documento pôde ser carregado das URLs.');
    return 'Não foi possível carregar o conteúdo das fontes da web.';
  }

  console.log(
    'STEP 3: Dividindo os documentos da web em chunks com o RecursiveCharacterTextSplitter...',
  );
  const webChunks = await textSplitter.splitDocuments(loadedWebDocs);
  console.log(`✅ Documentos da web divididos em ${webChunks.length} chunks.`);
  // --- ETAPA B: ARMAZENAR NO VECTOR STORE E GERAR RESPOSTA ---

  console.log(
    'STEP 4: Salvando os novos chunks da web no Neo4j Vector Store...',
  );
  const cleanedWebChunks = webChunks.map((chunk) => {
    return {
      pageContent: chunk.pageContent,
      metadata: {},
    };
  });
  await neo4jVectorIndex.addDocuments(cleanedWebChunks);
  console.log('✅ Chunks da web salvos com sucesso.');

  console.log(
    'STEP 5: Buscando o contexto mais relevante (local + web) no Neo4j...',
  );
  const relevantDocs = await neo4jVectorIndex.similaritySearch(question, 5);
  const context = relevantDocs.map((doc) => doc.pageContent).join('\n\n');

  // --- ETAPA C: GERAR RESPOSTA FINAL ---
  const prompt = `
      Você é um assistente especialista. Responda à pergunta do usuário de forma completa e informativa,
      usando o contexto fornecido, que inclui tanto informações de base quanto informações recém-extraídas da web.

      Contexto:
      ---
      ${context}
      ---

      Pergunta: ${question}

      Resposta Detalhada:
  `.trim();

  const response = await model.invoke(prompt);

  await neo4jVectorIndex.close();
  return response.content;
}

async function main() {
  const question =
    'Is JavaScript a object oriented programing language? Explain the main concepts.';
  const answer = await answerQuestionWithWebSearch(question);

  console.log(`\n💡 Resposta Final (RAG + Web):\n${answer}`);
}

main();
