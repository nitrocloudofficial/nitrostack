export interface Student {
  id: string;
  fullName: string;
  email: string;
  department: string;
  semester: number;
  skillsKnown: string[];
  skillsToLearn: string[];
  availability: string;
  bio: string;
}

export const STUDENTS: Student[] = [
  {
    id: "student-001",
    fullName: "Alice Johnson",
    email: "alice@example.com",
    department: "Computer Science",
    semester: 5,
    skillsKnown: ["Python", "React"],
    skillsToLearn: ["Machine Learning", "Docker"],
    availability: "Weekend Evening",
    bio: "Frontend developer passionate about AI.",
  },
  {
    id: "student-002",
    fullName: "Bob Williams",
    email: "bob@example.com",
    department: "Computer Science",
    semester: 5,
    skillsKnown: ["Machine Learning", "Docker"],
    skillsToLearn: ["React"],
    availability: "Weekend Evening",
    bio: "AI enthusiast looking for React collaborators.",
  },
  {
    id: "student-003",
    fullName: "Charlie Davis",
    email: "charlie@example.com",
    department: "Information Technology",
    semester: 4,
    skillsKnown: ["Java", "SQL"],
    skillsToLearn: ["Node.js", "TypeScript"],
    availability: "Weekday Evening",
    bio: "Interested in backend development.",
  }
];