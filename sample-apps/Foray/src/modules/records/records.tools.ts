/**
 * CLASS RECORDS SERVER — the roster and the regulation log.
 *
 * Two tools, two very different scopes, ONE boundary:
 *
 *   get_roster    student_profile — names, scenarios, COUNTS. Faculty's
 *                 view of the class. Contains no reflection text, no chat
 *                 text, no per-student mastery.
 *   get_chat_log  chat_log — the raw student <-> agent transcript, kept
 *                 append-only for review (R-11). Faculty is REFUSED here
 *                 and the refusal is logged; the words stay with the
 *                 student. Same argument as get_reflection: honesty in the
 *                 chat depends on the teacher not reading it back.
 */

import { ToolDecorator as Tool, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { WardenGuard } from '../../foray/warden.guard.js';
import { api } from '../../foray/api.client.js';

export class RecordsTools {
  @Tool({
    name: 'get_roster',
    description:
      "The class roster: each student's name, case scenario and activity " +
      'COUNTS (reflections, questions asked, misconceptions named, chat ' +
      'sessions). Scope: student_profile — faculty allowed. Contains no ' +
      'raw student text.',
    inputSchema: z.object({
      class_id: z
        .string()
        .default('CLS_CN5')
        .describe('Class id, e.g. "CLS_CN5"'),
    }),
    examples: {
      request: { class_id: 'CLS_CN5' },
      response: [
        {
          name: 'Aarav Krishnan',
          student_id: 'S_004',
          scenario: 'Cleared after intervention',
          counts: { reflections: 7, questions_asked: 1, misconceptions_named: 2 },
        },
      ],
    },
  })
  @UseGuards(WardenGuard)
  async getRoster(input: { class_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_roster', { class_id: input.class_id });
    return api.get(
      `/internal/roster?class_id=${encodeURIComponent(input.class_id)}`,
    );
  }

  @Tool({
    name: 'get_chat_log',
    description:
      'One full chat transcript from the append-only interaction log ' +
      '(R-11) — the regulation record. Scope: chat_log. Faculty callers ' +
      'are refused and the refusal is written to the access log.',
    inputSchema: z.object({
      session_id: z.string().describe('Chat session id, e.g. "CS_9001"'),
    }),
    examples: {
      request: { session_id: 'CS_9001' },
      response: {
        id: 'CS_9001',
        student_id: 'S_004',
        messages: [
          { sender: 'student', text: 'the port is basically the connection…' },
          { sender: 'agent', text: 'A TCP connection is identified by…' },
        ],
      },
    },
  })
  @UseGuards(WardenGuard)
  async getChatLog(input: { session_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('get_chat_log', { session_id: input.session_id });
    return api.get(
      `/internal/chat-log/${encodeURIComponent(input.session_id)}`,
    );
  }
}
