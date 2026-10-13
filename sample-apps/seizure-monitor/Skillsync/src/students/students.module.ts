import { Module } from "@nitrostack/core";

import { StudentsService } from "./students.service.js";
import { StudentsTools } from "./students.tools.js";
import { StudentsResources } from "./students.resources.js";
import { StudentsPrompts } from "./students.prompts.js";

@Module({
    name: "students",
    description: "SkillSync AI Student Module",
    controllers: [
        StudentsTools,
        StudentsResources,
        StudentsPrompts,
    ],
    providers: [
        StudentsService,
    ],
})
export class StudentsModule {}