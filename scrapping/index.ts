import * as cheerio from "cheerio";
import axios from "axios";
import { addDocumentToVectorStore } from "../config/qdrant";

const extractLinks = async (
  html: string
): Promise<{ internalLink: string[]; externalLink: string[] }> => {
  try {
    const $ = cheerio.load(html);
    const internalLink: Set<string> = new Set();
    const externalLink: Set<string> = new Set();

    $("a").each((index, element) => {
      const link = $(element).attr("href");
      // Make sure the href attribute exists and is not empty
      if (link && link.trim() !== "" && !link.startsWith("#") && link !== "/") {
        if (link.startsWith("http") || link.startsWith("https")) {
          externalLink.add(link);
        } else {
          internalLink.add(link);
        }
      }
    });
    return {
      internalLink: Array.from(internalLink),
      externalLink: Array.from(externalLink),
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const extractData = async (html: string) => {
  const $ = cheerio.load(html);
  const body = $("body").html();
  const head = $("head").html();
  const { internalLink, externalLink } = await extractLinks(html);
  return {
    body,
    head,
    internalLink,
    externalLink,
  };
};

export const scrappingAndAddToVectorStore = async (url: string) => {
  const { data } = await axios.get(url);
  const { body, head, internalLink, externalLink } = await extractData(data);
  await addDocumentToVectorStore(body!, url);

  //Scraping internal links
  const internalLinkData = await Promise.all(
    internalLink.map(async (link: string) => {
      try {
        const uri = url + link;
        const { data } = await axios.get(uri);
        const { body, head, internalLink, externalLink } = await extractData(
          data
        );
        await addDocumentToVectorStore(body!, uri);
        return {
          body,
          head,
          internalLink,
          externalLink,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    })
  );

  return {
    data: {
      body,
      head,
      internalLink,
      externalLink,
      internalLinkData,
    },
    message: "Document added to vector store",
  };
};
