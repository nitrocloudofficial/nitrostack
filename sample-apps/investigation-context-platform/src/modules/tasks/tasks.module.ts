import { Module } from "@nitrostack/core";

import { TasksTools } from "./tasks.tools.js";
import { TasksResources } from "./tasks.resources.js";
import { TasksPrompts } from "./tasks.prompts.js";

@Module({
  name: "tasks",
  description: "Investigation Tasks Module",
  controllers: [
    TasksTools,
    TasksResources,
    TasksPrompts,
  ],
})
export class TasksModule {}