import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class StudentsPrompts {

  @Prompt({
    name: "student_registration_help",
    description: "Guide users through SkillSync AI student registration.",
  })
  async registrationHelp(ctx: ExecutionContext) {

    ctx.logger.info("Student registration prompt requested");

    return {
      description: "SkillSync AI Registration Guide",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `
Welcome to SkillSync AI!

To register, provide the following information:

• Full Name
• Email Address
• Department
• Semester
• Skills You Already Know
• Skills You Want To Learn
• Availability
• Short Bio

After collecting this information, call the tool:

register_student

to create the student's profile.
            `,
          },
        },
      ],
    };
  }

  @Prompt({
    name: "student_search_help",
    description: "Explain how to search for students.",
  })
  async searchHelp(ctx: ExecutionContext) {

    ctx.logger.info("Student search prompt requested");

    return {
      description: "Student Search Guide",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `
You can search students by:

• Department
• Skills
• Availability

Use the tool:

search_students

to find matching students.
            `,
          },
        },
      ],
    };
  }
}