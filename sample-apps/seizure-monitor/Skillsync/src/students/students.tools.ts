import {
  ToolDecorator as Tool,
  ExecutionContext,
  Injectable,
  z,
} from "@nitrostack/core";

import { StudentsService } from "./students.service.js";

const RegisterStudentSchema = z.object({
  fullName: z.string().min(1).describe("Student full name"),
  email: z.string().email().describe("Student email"),
  department: z.string().min(1).describe("Department"),
  semester: z.number().int().positive(),
  skillsKnown: z.array(z.string()).min(1),
  skillsToLearn: z.array(z.string()).min(1),
  availability: z.string().min(1),
  bio: z.string().min(1),
});

const GetStudentSchema = z.object({
  id: z.string(),
});

const SearchStudentSchema = z.object({
  department: z.string().optional(),
  skill: z.string().optional(),
  availability: z.string().optional(),
});

@Injectable({
  deps: [StudentsService],
})
export class StudentsTools {
  constructor(
    private readonly studentsService: StudentsService,
  ) {}

  @Tool({
    name: "register_student",
    description: "Register a new student into SkillSync AI.",
    inputSchema: RegisterStudentSchema,
    examples: {
      request: {
        fullName: "Alice Johnson",
        email: "alice@example.com",
        department: "Computer Science",
        semester: 5,
        skillsKnown: ["Python", "React"],
        skillsToLearn: ["Machine Learning"],
        availability: "Weekend Evening",
        bio: "Frontend developer interested in AI.",
      },
    },
  })
  async registerStudent(
    input: z.infer<typeof RegisterStudentSchema>,
    ctx: ExecutionContext,
  ) {
    const student = this.studentsService.registerStudent(input);

    ctx.logger.info("Student Registered", {
      id: student.id,
      name: student.fullName,
    });

    return {
      success: true,
      student,
    };
  }

  @Tool({
    name: "get_student",
    description: "Get a student by ID.",
    inputSchema: GetStudentSchema,
  })
  async getStudent(
    input: z.infer<typeof GetStudentSchema>,
    ctx: ExecutionContext,
  ) {
    const student = this.studentsService.getStudentById(input.id);

    if (!student) {
      throw new Error("Student not found.");
    }

    ctx.logger.info("Student Retrieved", {
      id: student.id,
    });

    return {
      student,
    };
  }

  @Tool({
    name: "list_students",
    description: "List all registered students.",
    inputSchema: z.object({}),
  })
  async listStudents(
    input: Record<string, never>,
    ctx: ExecutionContext,
  ) {
    const students = this.studentsService.getAllStudents();

    ctx.logger.info("Listing Students", {
      total: students.length,
    });

    return {
      totalStudents: students.length,
      students,
    };
  }

  @Tool({
    name: "search_students",
    description: "Search students by department, skill or availability.",
    inputSchema: SearchStudentSchema,
  })
  async searchStudents(
    input: z.infer<typeof SearchStudentSchema>,
    ctx: ExecutionContext,
  ) {
    const students = this.studentsService.searchStudents(input);

    ctx.logger.info("Student Search", {
      results: students.length,
    });

    return {
      totalStudents: students.length,
      students,
    };
  }
}