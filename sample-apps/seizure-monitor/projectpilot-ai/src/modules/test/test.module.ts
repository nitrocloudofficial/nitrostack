import { Module } from "@nitrostack/core";
import { TestTools } from "./test.tools.js";

@Module({
  name: "test",
  description: "Testing Module",

  controllers: [
    TestTools,
  ],

  providers: [],
})
export class TestModule {}