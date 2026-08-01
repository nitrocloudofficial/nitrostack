import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

export class NotesResources {
  @Resource({
    uri: 'campuspilot://syllabus',
    name: 'Course Syllabus',
    description: 'Complete syllabus for all 5 subjects in the current semester: DBMS, Operating Systems, Computer Networks, Software Engineering, and Theory of Computation. Includes unit-wise topics, key definitions, and study materials.',
    mimeType: 'application/json',
  })
  async getSyllabusData(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving syllabus resource');

    const filePath = path.join(RESOURCES_PATH, 'syllabus.json');
    const raw = fs.readFileSync(filePath, 'utf-8');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: raw,
        },
      ],
    };
  }
}
