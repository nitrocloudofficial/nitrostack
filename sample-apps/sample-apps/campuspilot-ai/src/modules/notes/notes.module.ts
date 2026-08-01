import { Module } from '@nitrostack/core';
import { NotesTools } from './notes.tools.js';
import { NotesResources } from './notes.resources.js';
import { NotesPrompts } from './notes.prompts.js';

@Module({
  name: 'notes',
  description: 'Notes intelligence agent: summarize subjects, explain topics, and generate flashcards',
  controllers: [NotesTools, NotesResources, NotesPrompts],
})
export class NotesModule {}
