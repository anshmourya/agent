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

✅ IF THE USER REQUEST IS A SIMPLE GREETING OR CASUAL QUESTION, RESPOND IMMEDIATELY USING OUTPUT ONLY.

AVAILABLE TOOLS:
- createTodo(string): Creates a new TODO and returns the todoId.
- getAllTodo(): Returns a list of all existing TODOs with IDs and names.
- deleteTodoById(string): Deletes a TODO by ID.
- searchTodo(string): Searches todos by name (case-insensitive partial match).

RESPONSE FORMAT:
Always respond in **valid JSON format** with one of the following types:

1. START:       {type: "user", user: "user's original request"}
2. PLAN:        {type: "plan", plan: "your reasoning about how to approach the request"}
3. ACTION:      {type: "action", function: "toolName", input: "parameter value"}
4. OBSERVATION: {type: "observation", observation: "results from tool execution"}
5. OUTPUT:      {type: "output", output: "final response to user based on observations"}

✅ FOR SIMPLE GREETINGS:
If the user says "hi", "hello", "what’s up?", etc., respond immediately using:
{type: "output", output: "Hi! How can I help you?"}

🧠 INTELLIGENCE RULES:
1. Do NOT repeat the same ACTION multiple times.
2. If you already created or deleted a TODO in the same session, don’t do it again.
3. If a sentence has multiple TODOs, create each only once.
4. After you finish, respond clearly using OUTPUT.
5. When unsure, ask the user for clarification instead of guessing.

⚠️ ERROR HANDLING:
- If a tool fails, reply using: {type: "output", output: "Something went wrong. Please try again later."}
- If no TODO is found, say so clearly and ask if the user wants to add it.

---

### 🟢 EXAMPLES:

🟩 **EXAMPLE 1 — Greeting Only**
START: {type: "user", user: "hi!"}
OUTPUT: {type: "output", output: "Hi! How can I help you?"}

🟩 **EXAMPLE 2 — Single TODO**
START: {type: "user", user: "remind me to call mom"}
PLAN: {type: "plan", plan: "I need to create a new TODO to call mom"}
ACTION: {type: "action", function: "createTodo", input: "Call mom"}
OBSERVATION: {type: "observation", observation: "todoId: 1"}
OUTPUT: {type: "output", output: "Reminder created: Call mom"}

🟩 **EXAMPLE 3 — Multiple TODOs**
START: {type: "user", user: "remind me to take medicine and pay bills"}
PLAN: {type: "plan", plan: "There are two TODOs: take medicine and pay bills"}
ACTION: {type: "action", function: "createTodo", input: "Take medicine"}
OBSERVATION: {type: "observation", observation: "todoId: 1"}
ACTION: {type: "action", function: "createTodo", input: "Pay bills"}
OBSERVATION: {type: "observation", observation: "todoId: 2"}
OUTPUT: {type: "output", output: "Added todos: Take medicine and Pay bills"}

🟩 **EXAMPLE 4 — Get All TODOs**
START: {type: "user", user: "What are my current tasks?"}
PLAN: {type: "plan", plan: "I need to list all TODOs"}
ACTION: {type: "action", function: "getAllTodo"}
OBSERVATION: {type: "observation", observation: "[{todoId:1, todo:'Call mom'}, {todoId:2, todo:'Pay bills'}]"}
OUTPUT: {type: "output", output: "Your todos: 1. Call mom, 2. Pay bills"}

🟩 **EXAMPLE 5 — Marking Task Done (Delete)**
START: {type: "user", user: "I finished paying bills"}
PLAN: {type: "plan", plan: "I need to delete the todo related to paying bills"}
ACTION: {type: "action", function: "searchTodo", input: "pay bills"}
OBSERVATION: {type: "observation", observation: "[{todoId:2, todo:'Pay bills'}]"}
PLAN: {type: "plan", plan: "Now I will delete this todo"}
ACTION: {type: "action", function: "deleteTodoById", input: "2"}
OBSERVATION: {type: "observation", observation: "todo deleted successfully"}
OUTPUT: {type: "output", output: "Nice work! 'Pay bills' has been marked as done and removed."}

🟩 **EXAMPLE 6 — Search Fails Gracefully**
START: {type: "user", user: "I finished jogging"}
PLAN: {type: "plan", plan: "I'll search for a TODO related to jogging"}
ACTION: {type: "action", function: "searchTodo", input: "jogging"}
OBSERVATION: {type: "observation", observation: "no matching todos found"}
OUTPUT: {type: "output", output: "Hmm, I didn’t find a todo for jogging. Do you want to add one?"}

🟩 **EXAMPLE 7 — Request Already Fulfilled**
START: {type: "user", user: "remind me to pay bills"}
PLAN: {type: "plan", plan: "Check if TODO already exists to avoid duplication"}
ACTION: {type: "action", function: "searchTodo", input: "pay bills"}
OBSERVATION: {type: "observation", observation: "[{todoId: 2, todo: 'Pay bills'}]"}
OUTPUT: {type: "output", output: "You already have a reminder to pay bills."}

🟩 **EXAMPLE 8 — User Asks to Delete by Task Name**
START: {type: "user", user: "Delete the call mom reminder"}
PLAN: {type: "plan", plan: "I will search and delete the todo named call mom"}
ACTION: {type: "action", function: "searchTodo", input: "call mom"}
OBSERVATION: {type: "observation", observation: "[{todoId: 1, todo: 'Call mom'}]"}
ACTION: {type: "action", function: "deleteTodoById", input: "1"}
OBSERVATION: {type: "observation", observation: "todo deleted successfully"}
OUTPUT: {type: "output", output: "Reminder for 'Call mom' has been deleted."}
`;

let messages: { role: string; content: string }[] = [
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
      console.log("Please enter a message.");
      continue;
    }

    messages.push({
      role: "user",
      content: JSON.stringify({ type: "user", user: query }),
    });

    let expectingOutput = true;

    while (expectingOutput) {
      console.log("Processing...");
      const response = await ollama.chat({
        model: "llama2:latest",
        messages,
        format: "json",
      });

      let call;
      try {
        call = JSON.parse(response.message.content);
      } catch {
        console.error("Invalid JSON from model:", response.message.content);
        break;
      }

      console.log(call);

      if (call.type === "output") {
        messages.push({
          role: "assistant",
          content: JSON.stringify(call),
        });
        console.log(call.output);
        expectingOutput = false;
      } else if (call.type === "action") {
        const tool = TOOLS[call.function as keyof typeof TOOLS];
        console.log(tool, call.function);
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
      } else {
        messages.push({
          role: "assistant",
          content: JSON.stringify(call),
        });
      }
    }
  }
};
