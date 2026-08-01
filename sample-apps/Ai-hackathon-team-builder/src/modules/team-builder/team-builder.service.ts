import { Injectable } from '@nitrostack/core';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

@Injectable()
export class TeamBuilderService {
  async registerStudent(input: {
    name: string;
    department: string;
    skills: string[];
    interests: string[];
    experience: string;
    availability: string[];
  }) {
    const res = await fetch(`${BACKEND_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        department: input.department,
        year: '3rd Year',
        skills: input.skills,
        interests: input.interests,
        experience_level: input.experience,
        availability: input.availability
      })
    });
    return await res.json();
  }

  async findStudents(skill?: string, experience?: string) {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (experience) params.append('experience', experience);

    const res = await fetch(`${BACKEND_URL}/api/students?${params.toString()}`);
    return await res.json();
  }

  async calculateCompatibilityScore(studentIds: number[]) {
    const res = await fetch(`${BACKEND_URL}/api/teams/compatibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: studentIds })
    });
    return await res.json();
  }

  async analyzeTeam(teamId: number) {
    const res = await fetch(`${BACKEND_URL}/api/teams/${teamId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  }

  async assignRoles(teamId: number) {
    const res = await fetch(`${BACKEND_URL}/api/teams/${teamId}/assign-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  }

  async generateTaskPlan(teamId: number, projectType?: string) {
    const res = await fetch(`${BACKEND_URL}/api/teams/${teamId}/task-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_type: projectType })
    });
    return await res.json();
  }
}
