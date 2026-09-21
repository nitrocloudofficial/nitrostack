import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

@Controller('analytics')
export class AnalyticsController {
    @Tool({
        name: 'analytics_course',
        description: 'Retrieves analytical topic weightage for a course based on Past Year Questions (PYQs).',
        inputSchema: z.object({
            course_name: z.string().describe('The name of the course (e.g. Operating Systems)')
        })
    })
    @Widget('analytics')
    async getAnalytics(params: { course_name: string }) {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase credentials");

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Resolve course name to course id
        const { data: course, error: courseError } = await supabase.from('courses').select('id, name').ilike('name', params.course_name).maybeSingle();
        
        if (courseError || !course) {
            throw new Error(`Course not found: ${params.course_name}. Please upload a document for this course first.`);
        }

        // Fetch deterministic analytics using the RPC function
        const { data: topics, error } = await supabase.rpc('get_topic_weightage', { target_course_id: course.id });
        if (error) throw new Error("Failed to fetch analytics: " + error.message);

        return {
            success: true,
            course_name: course.name,
            topics: topics || []
        };
    }
}
