import "dotenv/config";
import express, { Express, Request, Response } from "express";
import { handleChat } from "./ollama";
import { scrappingAndAddToVectorStore } from "./scrapping";
import { searchDocument } from "./config/qdrant";

const app: Express = express();
const port = process.env.PORT ?? 3000;

//search for software engineer jobs
// scrappingAndAddToVectorStore("https://www.piyushgarg.dev").then((res) => {
//   console.log(res);
// });

searchDocument("hllo").then((res) => {
  console.log(res);
});

// app.use(express.json());

// app.get("/", (req: Request, res: Response) => {
//   res.send("Express + TypeScript Server is running");
// });

// app.listen(port, () => {
//   console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
// });
