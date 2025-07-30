import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { OllamaEmbeddings } from '@langchain/ollama';
import { env } from './env';

const config = {
  url: env.NEO4J_URI,
  username: env.NEO4J_USER,
  password: env.NEO4J_PASSWORD,
  textNodeProperties: ['text'],
  indexName: 'sim_example_index',
  keywordIndexName: 'sim_example_keywords',
  embeddingNodeProperty: 'embedding',
};

const ollamaEmbeddings = new OllamaEmbeddings({
  model: env.EMBEDDING_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
});

const neo4jVectorIndex = await Neo4jVectorStore.fromExistingGraph(
  ollamaEmbeddings,
  config,
);

const documents = [
  { pageContent: 'the author who commented most is Erick', metadata: {} },
  { pageContent: 'the less active author is Ana', metadata: {} },
  {
    pageContent: 'the post abc is the one who received less comments',
    metadata: {},
  },
  {
    pageContent: 'the post ewacademy is the one who received more comments',
    metadata: {},
  },
];

async function addDocumentIfNotExists(doc: (typeof documents)[0]) {
  const [searchResults] = await neo4jVectorIndex.similaritySearchWithScore(
    doc.pageContent,
    1,
  );
  if (!searchResults) {
    await neo4jVectorIndex.addDocuments([doc]);
    return;
  }
  const [document, score] = searchResults;
  if (
    score > 0.9 &&
    document.pageContent === '\ntext: '.concat(doc.pageContent)
  ) {
    console.log(`🚫 Skipping duplicate: "${doc.pageContent}"`);
  } else {
    console.log(`✅ Adding new document: "${doc.pageContent}"`);
    await neo4jVectorIndex.addDocuments([doc]);
  }
}

for (const doc of documents) {
  await addDocumentIfNotExists(doc);
}

async function makeAQuestion(question: string) {
  const [result] = await neo4jVectorIndex.similaritySearchWithScore(
    question,
    1,
  );

  if (!result) {
    console.log(`❌ No results found for: "${question}"`);
    return;
  }
  const [document, score] = result;
  console.log('🔍 Search Results:', question, document, score);
}

await makeAQuestion('which one is the most popular post?');
await makeAQuestion('which one is the less popular post?');
await makeAQuestion('which one is top post?');
await makeAQuestion('which one is worst post?');

await neo4jVectorIndex.close();
