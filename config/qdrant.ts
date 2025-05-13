import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TokenTextSplitter } from "@langchain/textsplitters";
import { HtmlToTextTransformer } from "@langchain/community/document_transformers/html_to_text";
const embeddings = new OllamaEmbeddings({
  model: "mxbai-embed-large",
  baseUrl: "localhost",
  truncate: true,
});

const splitter = new TokenTextSplitter({
  encodingName: "gpt2",
  chunkSize: 512,
  chunkOverlap: 50,
});
const transformer = new HtmlToTextTransformer();
const sequence = splitter.pipe(transformer);

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

//create embeddings
const createEmbeddings = async (text: string) => {
  try {
    const data = await embeddings.embedQuery(text);
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//add document to vector store
const addDocumentToVectorStore = async (
  body: string,
  uri: string
): Promise<string> => {
  try {
    console.log("Adding document to vector store");

    const documents = await sequence.invoke([
      {
        pageContent: body,
        metadata: {
          uri,
        },
        id: crypto.randomUUID(),
      },
    ]);

    await QdrantVectorStore.fromExistingCollection(embeddings, {
      client,
      collectionName: "web_content",
    });
    console.log("Document added to vector store");
    return "Document added to vector store";
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export { embeddings, createEmbeddings, addDocumentToVectorStore };
