import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { getWeather } from './tools';
import { handleChat } from './ollama';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

handleChat('what is the weather in chandighar and pune?');

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server is running');
});

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});