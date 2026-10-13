import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class StudentsResources {

  @Resource({
    uri: "students://departments",
    name: "Student Departments",
    description: "Available departments in SkillSync AI",
  })
  async departments(ctx: ExecutionContext) {

    ctx.logger.info("Loading departments");

    return {
      departments: [
        "Computer Science",
        "Information Technology",
        "Artificial Intelligence",
        "Data Science",
        "Cyber Security",
        "Electronics",
        "Mechanical Engineering",
        "Civil Engineering",
      ],
    };
  }

  @Resource({
    uri: "students://skills",
    name: "Skill Catalog",
    description: "Supported technical skills",
  })
  async skills(ctx: ExecutionContext) {

    ctx.logger.info("Loading skills");

    return {
      skills: [
        "Python",
        "Java",
        "C",
        "C++",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "Express",
        "SQL",
        "MongoDB",
        "Machine Learning",
        "Deep Learning",
        "Docker",
        "Git",
      ],
    };
  }

  @Resource({
    uri: "students://availability",
    name: "Availability",
    description: "Student availability options",
  })
  async availability(ctx: ExecutionContext) {

    ctx.logger.info("Loading availability");

    return {
      availability: [
        "Weekday Morning",
        "Weekday Afternoon",
        "Weekday Evening",
        "Weekend Morning",
        "Weekend Afternoon",
        "Weekend Evening",
        "Flexible",
      ],
    };
  }
}