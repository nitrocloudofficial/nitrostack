import { Injectable } from "@nitrostack/core";
import { STUDENTS, Student } from "./students.data.js";

@Injectable()
export class StudentsService {
  /**
   * Get all registered students
   */
  getAllStudents(): Student[] {
    return STUDENTS;
  }

  /**
   * Get a student by ID
   */
  getStudentById(id: string): Student | undefined {
    return STUDENTS.find(student => student.id === id);
  }

  /**
   * Register a new student
   */
  registerStudent(
    student: Omit<Student, "id">
  ): Student {

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      ...student,
    };

    STUDENTS.push(newStudent);

    return newStudent;
  }

  /**
   * Search students using optional filters
   */
  searchStudents(filters: {
    department?: string;
    skill?: string;
    availability?: string;
  }): Student[] {

    let students = [...STUDENTS];

    if (filters.department) {
      students = students.filter(student =>
        student.department
          .toLowerCase()
          .includes(filters.department!.toLowerCase())
      );
    }

    if (filters.skill) {
      students = students.filter(student =>
        student.skillsKnown.some(skill =>
          skill.toLowerCase().includes(filters.skill!.toLowerCase())
        )
      );
    }

    if (filters.availability) {
      students = students.filter(student =>
        student.availability
          .toLowerCase()
          .includes(filters.availability!.toLowerCase())
      );
    }

    return students;
  }

  /**
   * Return students wanting to learn a particular skill
   */
  getStudentsLearning(skill: string): Student[] {

    return STUDENTS.filter(student =>
      student.skillsToLearn.some(s =>
        s.toLowerCase() === skill.toLowerCase()
      )
    );
  }

  /**
   * Return students who already know a skill
   */
  getStudentsTeaching(skill: string): Student[] {

    return STUDENTS.filter(student =>
      student.skillsKnown.some(s =>
        s.toLowerCase() === skill.toLowerCase()
      )
    );
  }
}