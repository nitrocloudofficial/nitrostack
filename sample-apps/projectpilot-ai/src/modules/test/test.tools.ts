import {
  Injectable,
  ToolDecorator as Tool,
} from "@nitrostack/core";
import { z } from "zod";

@Injectable()
export class TestTools {
  constructor() {
    console.log("================================");
    console.log("TestTools Constructor Called");
    console.log("================================");
  }

  @Tool({
    name: "hello",
    description: "Simple hello world tool",
    inputSchema: z.object({}),
  })
  async hello() {
    console.log("================================");
    console.log("HELLO TOOL EXECUTED");
    console.log("================================");

    return {
      success: true,
      message: "Hello World",
    };
  }
}