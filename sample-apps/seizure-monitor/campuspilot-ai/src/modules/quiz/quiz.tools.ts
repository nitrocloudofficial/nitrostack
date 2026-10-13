import { ToolDecorator as Tool, Widget, RateLimit, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadSyllabus() {
  const filePath = path.join(RESOURCES_PATH, 'syllabus.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

const MCQ_TEMPLATES: Record<string, Array<{ q: string; options: string[]; answer: string; explanation: string }>> = {
  'Database Management Systems': [
    {
      q: 'Which normal form eliminates transitive functional dependencies?',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      answer: '3NF',
      explanation: '3NF removes transitive dependencies where a non-key attribute depends on another non-key attribute.',
    },
    {
      q: 'In a relational database, what does a foreign key do?',
      options: ['Uniquely identifies a row', 'Links two tables together', 'Creates an index', 'Defines NULL constraints'],
      answer: 'Links two tables together',
      explanation: 'A foreign key references the primary key of another table, establishing a referential integrity constraint.',
    },
    {
      q: 'Which SQL clause is used to filter results after GROUP BY?',
      options: ['WHERE', 'HAVING', 'FILTER', 'ORDER BY'],
      answer: 'HAVING',
      explanation: 'HAVING is used to filter groups after aggregation, while WHERE filters individual rows before aggregation.',
    },
    {
      q: 'ACID stands for:',
      options: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Index, Data', 'Atomic, Complete, Indexed, Distributed', 'None of the above'],
      answer: 'Atomicity, Consistency, Isolation, Durability',
      explanation: 'ACID properties ensure reliable database transactions.',
    },
    {
      q: 'Which index structure is most commonly used for range queries?',
      options: ['Hash Index', 'B+ Tree', 'Bitmap Index', 'Dense Index'],
      answer: 'B+ Tree',
      explanation: 'B+ Trees support efficient range queries because all data is in leaf nodes connected by pointers.',
    },
    {
      q: 'Two-Phase Locking (2PL) ensures:',
      options: ['Faster transactions', 'Serializability', 'Deadlock prevention', 'Better indexing'],
      answer: 'Serializability',
      explanation: '2PL guarantees serializability by dividing the locking protocol into a growing phase and a shrinking phase.',
    },
  ],
  'Operating Systems': [
    {
      q: 'Which page replacement algorithm suffers from Belady\'s Anomaly?',
      options: ['LRU', 'FIFO', 'Optimal', 'Clock'],
      answer: 'FIFO',
      explanation: 'FIFO can actually increase page faults when more frames are added, known as Belady\'s Anomaly.',
    },
    {
      q: 'What is the purpose of TLB in memory management?',
      options: ['To store page tables', 'To speed up virtual-to-physical address translation', 'To manage disk I/O', 'To schedule processes'],
      answer: 'To speed up virtual-to-physical address translation',
      explanation: 'TLB (Translation Lookaside Buffer) is a hardware cache that stores recent page table entries for faster lookup.',
    },
    {
      q: 'Deadlock can be prevented by:',
      options: ['Allowing circular wait', 'Removing hold and wait condition', 'Allowing preemption of no resources', 'None of these'],
      answer: 'Removing hold and wait condition',
      explanation: 'One of the four necessary conditions for deadlock is hold and wait. Eliminating it prevents deadlock.',
    },
    {
      q: 'In Round Robin scheduling, the time quantum should be:',
      options: ['Very small', 'Very large', 'Balanced between context switch overhead and response time', 'Equal to burst time'],
      answer: 'Balanced between context switch overhead and response time',
      explanation: 'A very small quantum causes too many context switches; a very large quantum becomes FCFS.',
    },
    {
      q: 'Thrashing occurs when:',
      options: ['CPU utilization is 100%', 'Processes spend more time paging than executing', 'Disk I/O is slow', 'Memory is fragmented'],
      answer: 'Processes spend more time paging than executing',
      explanation: 'Thrashing is when the system is swapping pages so frequently that actual computation stalls.',
    },
  ],
  'Computer Networks': [
    {
      q: 'Which layer of the OSI model is responsible for routing?',
      options: ['Physical', 'Data Link', 'Network', 'Transport'],
      answer: 'Network',
      explanation: 'The Network Layer (Layer 3) handles logical addressing (IP) and routing between networks.',
    },
    {
      q: 'TCP provides which type of service?',
      options: ['Connectionless, Unreliable', 'Connection-oriented, Reliable', 'Connectionless, Reliable', 'None'],
      answer: 'Connection-oriented, Reliable',
      explanation: 'TCP establishes a connection via handshaking and ensures reliable data delivery with acknowledgments.',
    },
    {
      q: 'CRC is used for:',
      options: ['Encryption', 'Error Detection', 'Error Correction', 'Flow Control'],
      answer: 'Error Detection',
      explanation: 'Cyclic Redundancy Check (CRC) is a powerful error detection method used at the data link layer.',
    },
  ],
};

const VIVA_TEMPLATES: Record<string, string[]> = {
  'Database Management Systems': [
    'What is normalization and why is it important?',
    'Explain the difference between TRUNCATE, DELETE, and DROP in SQL.',
    'What are the ACID properties? Explain each with an example.',
    'What is the difference between clustered and non-clustered indexes?',
    'Explain the difference between INNER JOIN and LEFT JOIN with examples.',
    'What is a deadlock in database systems and how is it resolved?',
    'Explain functional dependency and its types.',
    'What is a view in SQL? When should you use it?',
    'Explain the concept of two-phase locking.',
    'What is the difference between 3NF and BCNF?',
  ],
  'Operating Systems': [
    'What is the difference between a process and a thread?',
    'Explain the Banker\'s Algorithm for deadlock avoidance.',
    'What is virtual memory and how does demand paging work?',
    'Explain the differences between FCFS, SJF, and Round Robin scheduling.',
    'What is a critical section problem and how is it solved using semaphores?',
    'Explain the concept of memory fragmentation (internal vs external).',
    'What is thrashing and how can it be prevented?',
    'Describe the difference between paging and segmentation.',
    'What are the different types of OS architectures?',
    'Explain context switching and its overhead.',
  ],
  'Computer Networks': [
    'Explain the difference between OSI and TCP/IP models.',
    'What is subnetting and why is it used?',
    'Explain how DNS resolution works step by step.',
    'What is the difference between TCP and UDP? When do you use each?',
    'Explain the three-way handshake in TCP.',
    'What is CSMA/CD and where is it used?',
    'Explain the difference between routing and switching.',
    'What is NAT and why is it needed?',
    'Describe the sliding window protocol.',
    'What is congestion control in TCP?',
  ],
  'Theory of Computation': [
    'What is the difference between DFA and NFA?',
    'Explain the subset construction algorithm to convert NFA to DFA.',
    'What is the Pumping Lemma for regular languages?',
    'Explain Chomsky Normal Form with an example.',
    'What is a Pushdown Automaton (PDA)?',
    'Describe the Church-Turing Thesis.',
    'What is the Halting Problem and why is it undecidable?',
    'Explain the concept of reducibility in computability theory.',
    'What are regular languages and how are they related to finite automata?',
    'What is an ambiguous grammar?',
  ],
};

export class QuizTools {
  @Tool({
    name: 'generate_quiz',
    description: `Generate quiz questions for exam preparation or practice.
      Use this tool when the student asks: "Generate MCQs for DBMS", "Give me viva questions on OS", "Create practice questions for Networks", "Make flashcards for TOC", "Generate 10 interview questions on [topic]".
      Supports MCQ, viva/short-answer, and flashcard formats.`,
    inputSchema: z.object({
      subject: z.string()
        .describe('Subject to generate questions for, e.g. "DBMS", "OS", "Networks", "TOC", "Software Engineering"'),
      type: z.enum(['mcq', 'viva', 'flashcard', 'mixed'])
        .default('mcq')
        .describe('Question type: "mcq" for multiple choice, "viva" for oral/short-answer questions, "flashcard" for definition cards, "mixed" for a combination.'),
      count: z.number().min(1).max(20).default(5)
        .describe('Number of questions to generate (1-20). Defaults to 5.'),
      topic: z.string().optional()
        .describe('Optional: specific topic within the subject to focus on, e.g. "Normalization", "Paging", "Deadlock"'),
    }),
    examples: {
      request: { subject: 'DBMS', type: 'mcq', count: 5 },
      response: {
        subject: 'Database Management Systems',
        type: 'mcq',
        count: 5,
        questions: [{ question: 'Which normal form eliminates transitive dependencies?', options: ['1NF', '2NF', '3NF', 'BCNF'], answer: '3NF' }]
      }
    }
  })
  @RateLimit({ requests: 30, window: '1m' })
  @Widget('quiz-view')
  async generateQuiz(input: { subject: string; type: string; count: number; topic?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating quiz', { subject: input.subject, type: input.type, count: input.count });

    const data = loadSyllabus();
    const query = input.subject.toLowerCase();

    const subjectData = data.subjects.find(
      (s: any) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().split(' ').some((w: string) => query.includes(w.substring(0, 4)))
    );

    const subjectName = subjectData?.name || input.subject;
    const mcqPool = MCQ_TEMPLATES[subjectName] || MCQ_TEMPLATES['Database Management Systems'];
    const vivaPool = VIVA_TEMPLATES[subjectName] || VIVA_TEMPLATES['Database Management Systems'];

    let questions: any[] = [];

    if (input.type === 'mcq' || input.type === 'mixed') {
      const shuffled = mcqPool.sort(() => Math.random() - 0.5);
      const count = input.type === 'mixed' ? Math.ceil(input.count / 2) : input.count;
      questions.push(
        ...shuffled.slice(0, Math.min(count, shuffled.length)).map((q, i) => ({
          id: i + 1,
          type: 'mcq',
          question: q.q,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        }))
      );
    }

    if (input.type === 'viva' || input.type === 'mixed') {
      const shuffled = vivaPool.sort(() => Math.random() - 0.5);
      const startIdx = questions.length;
      const count = input.type === 'mixed' ? Math.floor(input.count / 2) : input.count;
      questions.push(
        ...shuffled.slice(0, Math.min(count, shuffled.length)).map((q, i) => ({
          id: startIdx + i + 1,
          type: 'viva',
          question: q,
          hint: 'Answer in 3-4 sentences. Include a definition, how it works, and a real-world example.',
        }))
      );
    }

    if (input.type === 'flashcard') {
      const units = subjectData?.units || [];
      let cardIdx = 1;
      for (const unit of units) {
        if (unit.keyDefinitions) {
          for (const [term, def] of Object.entries(unit.keyDefinitions)) {
            if (cardIdx > input.count) break;
            questions.push({
              id: cardIdx++,
              type: 'flashcard',
              front: term,
              back: def,
              unit: `Unit ${unit.unit}: ${unit.title}`,
            });
          }
        }
        if (cardIdx > input.count) break;
      }
    }

    // Limit to requested count
    questions = questions.slice(0, input.count);

    return {
      subject: subjectName,
      type: input.type,
      requestedCount: input.count,
      generated: questions.length,
      questions,
      studyTip: `Review each answer carefully. For MCQs, understand WHY the wrong options are wrong. For viva questions, practice speaking your answer aloud.`,
      timeEstimate: `${questions.length * 2}-${questions.length * 3} minutes to complete this quiz.`,
    };
  }
}
