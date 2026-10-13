import { McpApp, Module, ConfigModule } from "@nitrostack/core";

import { StudentsModule } from "./students/students.module.js";
import { MatchingModule } from "./matching/matching.module.js";
import { ChatModule } from "./chat/chat.module.js";

@McpApp({
  module: AppModule,
  server: {
    name: "skillsync-ai",
    version: "1.0.0",
  },
  logging: {
    level: "info",
  },
})
@Module({
  name: "app",
  imports: [
  ConfigModule.forRoot(),
  StudentsModule,
  MatchingModule,
  ChatModule,
],
})
export class AppModule {}