import { Module } from "@nitrostack/core";

import { SearchTools } from "./search.tools.js";
import { SearchResources } from "./search.resources.js";
import { SearchPrompts } from "./search.prompts.js";

@Module({
  name: "search",
  description: "Investigation Search",
  controllers: [
    SearchTools,
    SearchResources,
    SearchPrompts,
  ],
})
export class SearchModule {}