import { OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TokenTextSplitter } from "@langchain/textsplitters";
import { HtmlToTextTransformer } from "@langchain/community/document_transformers/html_to_text";
import { RetrievalQAChain, loadQAMapReduceChain } from "langchain/chains";
import { ChatOllama } from "@langchain/ollama";
import { console } from "inspector";
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

const vectorStore = new QdrantVectorStore(embeddings, {
  collectionName: "web_content",
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
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

    await vectorStore.addDocuments(documents);

    console.log("Document added to vector store");
    return "Document added to vector store";
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const SYSTEM_PROMPT =
  "You are a helpful assistant who can answer questions about the web content from the given documents make sure to answer in a concise and accurate manner use bullet points to make the answer easy to read and make sure to answer in a professional manner.";

//search document
const searchDocument = async (query: string) => {
  try {
    const llm = new ChatOllama({
      model: "mistral:latest",
      baseUrl: "localhost",
    });
  } catch (error) {
    console.log("Error in searchDocument:", error);
    throw error;
  }
};
export {
  embeddings,
  createEmbeddings,
  addDocumentToVectorStore,
  searchDocument,
};
