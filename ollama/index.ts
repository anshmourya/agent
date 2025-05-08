import { Ollama } from "ollama";
import { getWeather } from "../tools";
import {
  createTodo,
  getAllTodo,
  deleteTodoById,
  searchTodo,
} from "../controller/tasks";
import readlineSync from "readline-sync";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
const ollama = new Ollama({
  host: "localhost",
});

const TOOLS = {
  getWeather: getWeather,
  createTodo: createTodo,
  getAllTodo: getAllTodo,
  deleteTodoById: deleteTodoById,
  searchTodo: searchTodo,
};

//agent system prompt
const systemPrompt = `
You are an AI agent responsible for processing user requests and executing appropriate actions using available tools.
You follow a structured workflow with START, PLAN, ACTION, OBSERVATION, and OUTPUT steps.

AVAILABLE TOOLS:
- getWeather: Gets the weather for a given city
  Description: Takes a city name as input string and returns the weather for that city in JSON format

RESPONSE FORMAT:
Each of your responses must follow these formats based on the stage:
1. START: {type: "user", user: "user's original request"}
2. PLAN: {type: "plan", plan: "your reasoning about how to approach the request"}
3. ACTION: {type: "action", function: "toolName", input: "parameter value"}
4. OBSERVATION: {type: "observation", observation: "results from tool execution"}
5. OUTPUT: {type: "output", output: "final response to user based on observations"}

EXAMPLE:
START:
{type: "user", user: "what's the weather like in Delhi and Mumbai?"}
{type: "plan", plan: "I need to get the Delhi weather details from the getWeather tool"}
{type: "action", function: "getWeather", input: "Delhi"}
{type: "observation", observation: {
    "city": "Delhi",
    "country": "IN",
    "weather": {
        "main": "Clouds",
        "description": "overcast clouds",
        "temp": 285.07,
        "feels_like": 284.12,
        "humidity": 69,
        "wind_speed": 4.63
    }
}}
{type: "plan", plan: "Now I need to get the Mumbai weather details from the getWeather tool"}
{type: "action", function: "getWeather", input: "Mumbai"}
{type: "observation", observation: {
    "city": "Mumbai",
    "country": "IN",
    "weather": {
        "main": "Clear",
        "description": "clear sky",
        "temp": 301.15,
        "feels_like": 303.27,
        "humidity": 75,
        "wind_speed": 3.09
    }
}}
{type: "output", output: "The weather in Delhi is currently overcast clouds with a temperature of 12°C (285.07K), humidity of 69% and wind speed of 4.63 m/s. In Mumbai, it's clear sky with a temperature of 28°C (301.15K), humidity of 75% and wind speed of 3.09 m/s."}

IMPORTANT GUIDELINES:
- Always convert temperature from Kelvin to Celsius in your final output
- Provide concise, informative responses based on the tool's data
- If a request requires multiple tool calls, make them sequentially
- Format all numerical values appropriately
- Ensure all JSON is properly formatted with correct field names
- RESPONSE MUST BE IN JSON FORMAT ONLY
- DO NOT PROVIDE ANYTHING OTHER THAN JSON RESPONSE
- AFTER PLANNING, YOU MUST PROCEED TO ACTION. DO NOT REPEAT PLANNING STEPS.
`;

const todoSystemPrompt = `
You are an AI TODO agent responsible for processing user requests and executing appropriate actions using available tools.
You follow a structured workflow with START, PLAN, ACTION, OBSERVATION, and OUTPUT steps — unless the user's request is very simple, in which case you may respond directly using OUTPUT.

AVAILABLE TOOLS:
- createTodo: Creates a new TODO
  Description: Takes a todo name as input string and returns the todoId
  Example: createTodo("Learn Python")

- getAllTodo: Gets all TODOs
  Description: Returns a list of all existing TODOs with their IDs and names
  Example: getAllTodo()

- deleteTodoById: Deletes a TODO by ID
  Description: Takes a todoId as input string and deletes the corresponding todo
  Example: deleteTodoById("123")

- searchTodo: Searches for a TODO by name
  Description: Searches the todo database using a case-insensitive partial match
  Example: searchTodo("Learn")

RESPONSE FORMAT:
Each of your responses must follow these formats based on the stage:
1. START: {type: "user", user: "user's original request"}
2. PLAN: {type: "plan", plan: "your reasoning about how to approach the request"}
3. ACTION: {type: "action", function: "toolName", input: "parameter value"}
4. OBSERVATION: {type: "observation", observation: "results from tool execution"}
5. OUTPUT: {type: "output", output: "final response to user based on observations"}

IMPORTANT GUIDELINES:
1. Never treat "output" as a tool — it is not a function. It is used only to respond to the user.
2. If the user request is a simple greeting or casual question, you can skip the full sequence and respond directly using: {type: "output", output: "your message here"}
3. Always respond in valid JSON format
4. Handle errors gracefully and provide clear error messages
5. Maintain context between interactions when appropriate
6. Be concise but informative in your responses
7. Use tool descriptions to guide your actions
8. Provide clear feedback about the status of operations

ERROR HANDLING:
- If a tool fails, provide a clear error message
- If a todo ID is not found, inform the user
- If a search returns no results, suggest alternative actions
- Maintain a professional and helpful tone in all responses
`;

let messages = [
  {
    role: "system",
    content: todoSystemPrompt,
  },
];
export const handleChat = async () => {
  const rl = readline.createInterface({ input, output });
  while (true) {
    const query = (await rl.question("User: ")).trim();

    if (!query) {
      console.log("Please enter a message." + query);
      continue;
    }
    const userMessage = {
      type: "user",
      user: query,
    };

    messages.push({
      role: "user",
      content: JSON.stringify(userMessage),
    });

    let expectingOutput = true;

    while (expectingOutput) {
      console.log("Processing...");
      const response = await ollama.chat({
        model: "gemma3:4b",
        messages: messages,
        format: "json",
      });

      let call;
      try {
        call = JSON.parse(response.message.content);
      } catch (err) {
        console.error("Invalid JSON from model:", response.message.content);
        break;
      }

      console.log(call);

      switch (call.type) {
        case "output":
          messages.push({
            role: "assistant",
            content: JSON.stringify(call),
          });
          console.log(call.output);
          expectingOutput = false;
          break;
        case "action":
          const tool = TOOLS[call.function as keyof typeof TOOLS];
          if (!tool) {
            console.error(`Tool not found: ${call.function}`);
            break;
          }
          const toolOutput = await tool(call.input as never);
          messages.push({
            role: "user",
            content: JSON.stringify({
              type: "observation",
              observation: toolOutput,
            }),
          });
          break;

        default:
          messages.push({
            role: "assistant",
            content: JSON.stringify(call),
          });
          break;
      }
    }
  }
};
