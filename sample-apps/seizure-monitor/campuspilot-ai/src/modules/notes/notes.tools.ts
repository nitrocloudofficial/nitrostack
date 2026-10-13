import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadSyllabus() {
  const filePath = path.join(RESOURCES_PATH, 'syllabus.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export class NotesTools {
  @Tool({
    name: 'summarize_notes',
    description: `Summarize the notes and syllabus content for a given subject and optionally a specific unit.
      Use this tool when the student asks: "Summarize Unit 3 DBMS", "Give me notes for OS", "What are the key points in Networks Unit 2?", "Explain the syllabus for CS501".
      Returns structured key points, definitions, and topics to study.`,
    inputSchema: z.object({
      subject: z.string()
        .describe('Subject name or code, e.g. "DBMS", "CS501", "Operating Systems", "Networks", "TOC"'),
      unit: z.number().min(1).max(5).optional()
        .describe('Optional unit number (1-5) to focus on. Leave empty for a complete subject summary.'),
    }),
    examples: {
      request: { subject: 'DBMS', unit: 3 },
      response: {
        subject: 'Database Management Systems',
        unit: 3,
        title: 'Normalization',
        keyTopics: ['1NF', '2NF', '3NF', 'BCNF'],
        keyDefinitions: { BCNF: '...' },
        studyTips: ['Focus on functional dependencies', 'Practice converting to BCNF']
      }
    }
  })
  @Widget('notes-viewer')
  async summarizeNotes(input: { subject: string; unit?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Summarizing notes', { subject: input.subject, unit: input.unit });

    const data = loadSyllabus();
    const query = input.subject.toLowerCase();

    const subjectData = data.subjects.find(
      (s: any) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().split(' ').some((word: string) => query.includes(word.substring(0, 4)))
    );

    if (!subjectData) {
      return {
        error: `Subject "${input.subject}" not found in syllabus. Available subjects: DBMS (CS501), Operating Systems (CS502), Computer Networks (CS503), Software Engineering (CS504), Theory of Computation (CS505).`,
        availableSubjects: data.subjects.map((s: any) => ({ code: s.code, name: s.name })),
      };
    }

    if (input.unit) {
      const unitData = subjectData.units.find((u: any) => u.unit === input.unit);
      if (!unitData) {
        return {
          error: `Unit ${input.unit} not found for ${subjectData.name}. Available units: ${subjectData.units.map((u: any) => u.unit).join(', ')}.`,
        };
      }

      const studyTips = generateStudyTips(unitData);

      return {
        subject: subjectData.name,
        subjectCode: subjectData.code,
        unit: unitData.unit,
        unitTitle: unitData.title,
        keyTopics: unitData.topics,
        keyDefinitions: unitData.keyDefinitions || {},
        studyTips,
        flashcards: generateFlashcards(unitData),
        examImportance: getExamImportance(unitData.title),
        totalTopics: unitData.topics.length,
      };
    }

    // Full subject summary
    return {
      subject: subjectData.name,
      subjectCode: subjectData.code,
      totalUnits: subjectData.units.length,
      units: subjectData.units.map((u: any) => ({
        unit: u.unit,
        title: u.title,
        topicCount: u.topics.length,
        keyTopics: u.topics.slice(0, 3),
        hasDefinitions: !!u.keyDefinitions,
      })),
      allTopics: subjectData.units.flatMap((u: any) => u.topics),
      studyOrder: subjectData.units.map((u: any) => `Unit ${u.unit}: ${u.title}`),
      quickRevisionPlan: `Study ${subjectData.units.length} units. Allocate 2-3 hours per unit. Focus on definitions and examples.`,
    };
  }

  @Tool({
    name: 'explain_topic',
    description: `Explain a specific topic from the student's syllabus in simple terms with analogies.
      Use this tool when the student asks: "Explain [topic]", "What is [concept]?", "I don't understand [topic]", "Give me an example of [concept]".
      Returns a simplified explanation, real-world analogy, and practice questions.`,
    inputSchema: z.object({
      topic: z.string()
        .describe('The concept or topic to explain, e.g. "Normalization", "Paging", "Deadlock", "TCP", "DFA"'),
      subject: z.string().optional()
        .describe('Optional subject context to narrow down the explanation, e.g. "DBMS", "OS"'),
    }),
  })
  @Widget('notes-viewer')
  async explainTopic(input: { topic: string; subject?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Explaining topic', { topic: input.topic, subject: input.subject });

    const data = loadSyllabus();
    const query = input.topic.toLowerCase();

    // Search for the topic across all subjects
    let foundIn: any[] = [];
    for (const subject of data.subjects) {
      for (const unit of subject.units) {
        const matchingTopics = unit.topics.filter((t: string) =>
          t.toLowerCase().includes(query) || query.includes(t.toLowerCase().split(' ')[0])
        );

        if (matchingTopics.length > 0 || (unit.keyDefinitions && unit.keyDefinitions[input.topic])) {
          foundIn.push({
            subject: subject.name,
            subjectCode: subject.code,
            unit: unit.unit,
            unitTitle: unit.title,
            relatedTopics: unit.topics,
            definition: unit.keyDefinitions?.[input.topic] || unit.keyDefinitions?.[Object.keys(unit.keyDefinitions || {}).find(k => k.toLowerCase().includes(query.substring(0, 4)) || '') || ''],
          });
        }
      }
    }

    const context = foundIn[0];
    const practiceQuestions = generatePracticeQuestions(input.topic);

    return {
      topic: input.topic,
      foundInSubjects: foundIn.map(f => `${f.subject} - Unit ${f.unit}: ${f.unitTitle}`),
      context: context || null,
      definition: context?.definition || `${input.topic} is a core concept in computer science that you should study from your ${input.subject || 'course'} notes.`,
      explanation: `To truly understand "${input.topic}", study it in context of ${context?.unitTitle || 'your syllabus'} and connect it to related topics: ${context?.relatedTopics?.slice(0, 4).join(', ') || 'covered in your course'}.`,
      studyHints: [
        `Start with the definition and memorize it.`,
        `Draw a diagram or flowchart if applicable.`,
        `Create a real-world analogy to remember it.`,
        `Solve 2-3 practice problems on this topic.`,
        `Check if it appears in previous exam papers.`,
      ],
      practiceQuestions,
      relatedConcepts: context?.relatedTopics?.slice(0, 5) || [],
    };
  }
}

function generateFlashcards(unitData: any): Array<{ front: string; back: string }> {
  const cards: Array<{ front: string; back: string }> = [];

  if (unitData.keyDefinitions) {
    for (const [term, def] of Object.entries(unitData.keyDefinitions)) {
      cards.push({ front: `What is ${term}?`, back: def as string });
    }
  }

  unitData.topics.slice(0, 3).forEach((topic: string) => {
    cards.push({ front: `Explain: ${topic}`, back: `Study from Unit ${unitData.unit} - ${unitData.title}` });
  });

  return cards;
}

function generateStudyTips(unitData: any): string[] {
  return [
    `Master the ${unitData.topics.length} core topics in this unit systematically.`,
    `Create a mind map connecting all topics in "${unitData.title}".`,
    `Focus on definitions first — they appear frequently in exams.`,
    `Solve at least 3 previous-year questions on this unit.`,
    `Teach the concept to someone else to test your understanding.`,
  ];
}

function generatePracticeQuestions(topic: string): string[] {
  return [
    `Define ${topic} and explain its importance.`,
    `What are the advantages and disadvantages of ${topic}?`,
    `Explain ${topic} with a real-world example.`,
    `How does ${topic} differ from related concepts?`,
    `Write a short note on ${topic} (5 marks).`,
  ];
}

function getExamImportance(unitTitle: string): string {
  const highPriority = ['Normalization', 'Memory Management', 'Process', 'Routing', 'Turing'];
  const isHigh = highPriority.some(k => unitTitle.includes(k));
  return isHigh ? 'HIGH – This unit commonly appears in exams for 10+ marks.' : 'MEDIUM – Important unit, study thoroughly.';
}
