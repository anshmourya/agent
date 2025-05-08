import { Redis } from "ioredis";

export const client = new Redis({
  host: "localhost",
  port: 6379,
});

export const init = async () => {
  try {
     const result = await client.get("user:1");
    console.log(result);
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
