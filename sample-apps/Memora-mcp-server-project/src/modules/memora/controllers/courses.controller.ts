import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

@Controller('courses')
export class CoursesController {
    @Tool({
        name: 'courses_list',
        description: 'Lists all courses that the user has uploaded documents for.',
        inputSchema: z.object({})
    })
    @Widget('courses')
    async listCourses() {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase credentials");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: courses, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
        if (error) throw new Error("Failed to fetch courses: " + error.message);

        return {
            success: true,
            courses: courses || []
        };
    }

    @Tool({
        name: 'courses_create',
        description: 'Creates a new course.',
        inputSchema: z.object({
            name: z.string().describe('The name of the course')
        })
    })
    async createCourse(params: { name: string }) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase credentials");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: course, error } = await supabase.from('courses').insert({
            name: params.name
        }).select('*').single();

        if (error) throw new Error("Failed to create course: " + error.message);

        return {
            success: true,
            course
        };
    }

    @Tool({
        name: 'course_rename',
        description: 'Renames an existing course.',
        inputSchema: z.object({
            id: z.string().describe('The ID of the course to rename'),
            new_name: z.string().describe('The new name for the course')
        })
    })
    async renameCourse(params: { id: string; new_name: string }) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase credentials");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { error } = await supabase.from('courses').update({ name: params.new_name }).eq('id', params.id);
        if (error) throw new Error("Failed to rename course: " + error.message);

        return { success: true };
    }

    @Tool({
        name: 'course_delete',
        description: 'Deletes a course and all its associated documents (cascading).',
        inputSchema: z.object({
            id: z.string().describe('The ID of the course to delete')
        })
    })
    async deleteCourse(params: { id: string }) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase credentials");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { error } = await supabase.from('courses').delete().eq('id', params.id);
        if (error) throw new Error("Failed to delete course: " + error.message);

        return { success: true };
    }
}
