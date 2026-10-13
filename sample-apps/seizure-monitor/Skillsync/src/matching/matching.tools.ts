import {
  ToolDecorator as Tool,
  ExecutionContext,
  Injectable,
  z,
} from "@nitrostack/core";

import { StudentsService } from "../students/students.service.js";
import { MatchingService } from "./matching.service.js";

const MatchStudentSchema = z.object({
  studentId: z.string().describe("ID of the student to find peer matches for"),
});

@Injectable({
  deps: [StudentsService, MatchingService],
})
export class MatchingTools {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly matchingService: MatchingService,
  ) {}

  @Tool({
    name: "find_peer_matches",
    description: "Find the best peer learning partners for a student.",
    inputSchema: MatchStudentSchema,
    examples: {
      request: {
        studentId: "student-001",
      },
    },
  })
  async findPeerMatches(
    input: z.infer<typeof MatchStudentSchema>,
    ctx: ExecutionContext,
  ) {
    const student = this.studentsService.getStudentById(input.studentId);

    if (!student) {
      throw new Error("Student not found.");
    }

    const students = this.studentsService
      .getAllStudents()
      .filter((s) => s.id !== student.id);

    const matches = this.matchingService.findMatches(
      student,
      students,
    );

    ctx.logger.info("Peer matches generated", {
      studentId: student.id,
      totalMatches: matches.length,
    });

    return {
      student,
      totalMatches: matches.length,
      matches,
    };
  }
}