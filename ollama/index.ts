import { Ollama } from "ollama";
import { getWeather } from "../tools";
const ollama = new Ollama({
    host: 'localhost',
})

const TOOLS = {
    'getWeather': getWeather
}


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


let messages = [
    {
        role: 'system',
        content: systemPrompt,
    },
]
export const handleChat = async (userInput: string) => {
    while (true) {
        const query = userInput;
        const q = {
            type: 'user',
            user: query,
        }
        messages.push({
            role: 'user',
            content: JSON.stringify(q),
        });

        while (true) {
            const response = await ollama.chat({
                model: 'gemma3:4b',
                messages: messages,
                format: 'json',
            });

            const call = JSON.parse(response.message.content);
            console.log(call);

            if (call.type === 'output') {
                messages.push({
                    role: 'assistant',
                    content: JSON.stringify(call),
                });
                console.log(call.output);
                //return the output to the user and clear the message
                return call.output;
            } else if (call.type === 'action') {
                const tool = TOOLS[call.function as keyof typeof TOOLS];
                const toolOutput = await tool(call.input);
                messages.push({
                    role: 'user',
                    content: JSON.stringify({
                        type: 'observation',
                        observation: toolOutput,
                    }),
                });
            } else if (call.type === 'plan') {
                messages.push({
                    role: 'assistant',
                    content: JSON.stringify(call),
                });
            } else {
                messages.push({
                    role: 'assistant',
                    content: JSON.stringify(call),
                });
            }
        }
    }

}

