import "dotenv/config";
import express, { Express, Request, Response } from "express";
import { handleChat } from "./ollama";

const app: Express = express();
const port = process.env.PORT || 3000;

// app.use(express.json());

// app.get("/", (req: Request, res: Response) => {
//   res.send("Express + TypeScript Server is running");
// });

// app.listen(port, () => {
//   console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
// });

handleChat();
