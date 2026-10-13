import { Module } from "@nitrostack/core";

import { NotesTools } from "./notes.tools.js";
import { NotesResources } from "./notes.resources.js";
import { NotesPrompts } from "./notes.prompts.js";

@Module({
  name: "notes",
  description: "Investigation Notes Module",
  controllers: [
    NotesTools,
    NotesResources,
    NotesPrompts,
  ],
})
export class NotesModule {}