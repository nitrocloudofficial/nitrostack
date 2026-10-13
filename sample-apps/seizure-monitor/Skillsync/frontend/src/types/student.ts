export interface Student {
  id?: string;
  fullName: string;
  email: string;
  department: string;
  semester: number;
  skillsKnown: string[];
  skillsToLearn: string[];
  availability: string;
  bio: string;
}