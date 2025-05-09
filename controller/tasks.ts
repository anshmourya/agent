import { eq, ilike } from "drizzle-orm";
import db from "../config/db";
import { task } from "../schema/task";

//create task
export const createTodo = async (todo: string) => {
  try {
    let newTodo = {
      todo,
      status: "pending" as const,
    };
    const createTodo = await db.insert(task).values(newTodo).returning({
      todoId: task.id,
    });
    return createTodo;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//get all todo
export const getAllTodo = async () => {
  try {
    const todos = await db.select().from(task);
    return todos;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//delete todo
export const deleteTodoById = async (id: number) => {
  try {
    await db.delete(task).where(eq(task.id, id));
    return "Todo deleted successfully";
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//search todo
export const searchTodo = async (query: string) => {
  try {
    const result = await db.select().from(task).where(ilike(task.todo, query));
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
