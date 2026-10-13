import { Injectable } from "@nitrostack/core";
import { Student } from "../students/students.data.js";
export interface MatchResult {
  student: Student;
  compatibility: number;
  reasons: string[];
}

@Injectable()
export class MatchingService {

  findMatches(
    currentStudent: Student,
    students: Student[],
  ): MatchResult[] {

    const matches: MatchResult[] = [];

    for (const student of students) {

      if (student.id === currentStudent.id) {
        continue;
      }

      let score = 0;
      const reasons: string[] = [];

      // Same Department
      if (
        student.department.toLowerCase() ===
        currentStudent.department.toLowerCase()
      ) {
        score += 20;
        reasons.push("Same department");
      }

      // Same Semester
      if (student.semester === currentStudent.semester) {
        score += 15;
        reasons.push("Same semester");
      }

      // Skills they can teach you
      const canTeach = student.skillsKnown.filter(skill =>
        currentStudent.skillsToLearn.includes(skill)
      );

      if (canTeach.length > 0) {
        score += canTeach.length * 20;
        reasons.push(
          `Can teach: ${canTeach.join(", ")}`
        );
      }

      // Skills you can teach them
      const youCanTeach = currentStudent.skillsKnown.filter(skill =>
        student.skillsToLearn.includes(skill)
      );

      if (youCanTeach.length > 0) {
        score += youCanTeach.length * 20;
        reasons.push(
          `You can teach: ${youCanTeach.join(", ")}`
        );
      }

      // Same Availability
      if (
        student.availability.toLowerCase() ===
        currentStudent.availability.toLowerCase()
      ) {
        score += 25;
        reasons.push("Matching availability");
      }

      if (score > 100) {
        score = 100;
      }

      matches.push({
        student,
        compatibility: score,
        reasons,
      });

    }

    matches.sort(
      (a, b) => b.compatibility - a.compatibility
    );

    return matches;
  }

}