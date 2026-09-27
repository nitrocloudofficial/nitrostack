-- Migration: Add SyllabusX-Ray Parity Tables
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('syllabus', 'pyq', 'notes')),
    exam_year INTEGER,
    raw_markdown TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PYQ Questions Table (For exact SQL analytics)
CREATE TABLE IF NOT EXISTS pyq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    topic_name TEXT,
    marks INTEGER,
    exam_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Helper Function: Topic Weightage
CREATE OR REPLACE FUNCTION get_topic_weightage(target_course_id UUID)
RETURNS TABLE (
    topic_name TEXT,
    total_marks BIGINT,
    appearance_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.topic_name,
        COALESCE(SUM(q.marks), 0) as total_marks,
        COUNT(q.id) as appearance_count
    FROM pyq_questions q
    WHERE q.course_id = target_course_id
    GROUP BY q.topic_name
    ORDER BY total_marks DESC;
END;
$$ LANGUAGE plpgsql;
