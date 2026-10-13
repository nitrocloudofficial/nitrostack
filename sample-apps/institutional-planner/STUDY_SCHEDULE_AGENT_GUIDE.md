# AI Study Schedule Agent - Complete Guide

## Overview
The **AI Study Schedule Agent** is a comprehensive MCP server that helps students create personalized study schedules based on their curriculum, current GPA, and target CGPA. It provides intelligent scheduling, study load calculations, and multiple export formats.

---

## 🎯 Core Features

### 1. **Tools** (5 Model-Invoked Actions)

#### `parse_curriculum_pdf`
**Purpose**: Extract course information from curriculum PDFs or text
- **Input**: PDF content (base64 or text), student name (optional)
- **Output**: Structured course list with codes, names, credits, current grades, difficulty levels
- **Use Case**: Initial curriculum analysis and course extraction

**Example Usage**:
```
User: "Parse my curriculum PDF with these courses: CS101 (3 credits, grade 3.5), MATH201 (4 credits, grade 3.0)..."
Agent: Calls parse_curriculum_pdf → Returns structured curriculum data
```

---

#### `calculate_study_load`
**Purpose**: Calculate study hours needed per course to reach target CGPA
- **Input**: 
  - Current curriculum data
  - Target CGPA (0-4.0)
  - Weeks available
  - Hours per day available
- **Output**: Study load breakdown per course with priority levels
- **Use Case**: Determine feasibility and effort required

**Example Usage**:
```
User: "I have 8 weeks and can study 4 hours daily. Calculate study load to reach 3.5 CGPA from 2.8."
Agent: Calls calculate_study_load → Returns hours needed per course
```

---

#### `generate_daily_schedule`
**Purpose**: Create detailed daily/weekly study schedule with time blocks
- **Input**:
  - Study loads per course
  - Start date
  - Duration (weeks)
  - Study hours (start/end time)
  - Break frequency
  - Exam dates (optional)
- **Output**: Week-by-week schedule with daily time blocks, breaks, and milestones
- **Use Case**: Generate actionable study plan

**Example Usage**:
```
User: "Generate a 4-week schedule starting 2024-01-15, studying 09:00-17:00 with 15-min breaks."
Agent: Calls generate_daily_schedule → Returns detailed schedule with time blocks
```

---

#### `adjust_schedule`
**Purpose**: Modify schedule based on constraints and preferences
- **Input**:
  - Current schedule
  - Constraints:
    - Work hours per day
    - Other commitments
    - Preferred study hours
    - Learning pace (slow/normal/fast)
    - Days off
- **Output**: Adjusted schedule respecting all constraints
- **Use Case**: Personalize schedule for real-world constraints

**Example Usage**:
```
User: "Adjust my schedule - I work 4 hours daily, want weekends off, prefer normal pace."
Agent: Calls adjust_schedule → Returns modified schedule
```

---

#### `export_schedule`
**Purpose**: Export schedule in multiple formats
- **Input**:
  - Schedule data
  - Format: JSON, CSV, or iCal
  - Include metadata (optional)
- **Output**: Formatted schedule data ready for import
- **Use Case**: Share and integrate with other tools

**Example Usage**:
```
User: "Export my schedule as CSV so I can view it in Excel."
Agent: Calls export_schedule → Returns CSV-formatted schedule
```

---

### 2. **Resources** (5 Reference Data Sources)

#### `studyschedule://study-methodologies`
**Content**: Different study techniques and their effectiveness
- Pomodoro Technique (25 min focus + 5 min break)
- Spaced Repetition (review at intervals)
- Active Recall (frequent self-testing)
- Feynman Technique (explain simply)
- Deep Work (90+ min sessions)
- Interleaving (mix topics)

**Use Case**: Recommend study methods based on course type

---

#### `studyschedule://course-difficulty-map`
**Content**: Estimated effort per subject type
- **STEM**: Mathematics, Physics, Chemistry, CS, Biology
- **Humanities**: Literature, History, Philosophy, Languages
- **Social Sciences**: Economics, Psychology, Sociology
- **Arts**: Fine Arts, Music, Design

Each includes:
- Difficulty level
- Hours per credit
- Recommended study method
- Topics per week

**Use Case**: Estimate study hours needed

---

#### `studyschedule://gpa-conversion`
**Content**: Grade-to-GPA conversion tables
- US 4.0 Scale (A+ to F)
- UK 2.0 Scale (1st to Pass)
- Percentage Scale (90-100 to 0-49)

**Use Case**: Convert grades to GPA for calculations

---

#### `studyschedule://sample-schedules`
**Content**: Example schedules for different scenarios
- Full-Time Student (6 hours/day)
- Working Student (3 hours/day)
- Exam Preparation (8 hours/day)
- Balanced Approach (4 hours/day)

**Use Case**: Show templates and best practices

---

#### `studyschedule://study-tips`
**Content**: Evidence-based study tips
- Time Management
- Effective Studying
- Health & Wellness
- Exam Preparation
- Avoiding Procrastination

**Use Case**: Provide guidance and motivation

---

### 3. **Prompts** (5 Reusable Templates)

#### `analyze-curriculum`
Guides user through curriculum analysis and current performance assessment
- Explains the process
- Asks for curriculum PDF
- Requests current CGPA and target CGPA
- Clarifies available study time

---

#### `build-study-plan`
Structured conversation for comprehensive study plan creation
- Assessment phase (current/target CGPA, courses)
- Constraints & preferences (work, commitments, learning pace)
- Study preferences (techniques, timing)
- Timeline (exams, deadlines)

---

#### `optimize-schedule`
Helps refine and optimize generated schedules
- Time constraint adjustments
- Learning pace modifications
- Days off designation
- Study method switching
- Course prioritization

---

#### `study-tips-motivation`
Provides study tips and motivation
- Time management techniques
- Effective study methods
- Health & wellness advice
- Exam preparation strategies
- Procrastination prevention
- Course-specific tips

---

#### `track-progress`
Helps monitor progress and adjust schedule
- Study adherence metrics
- Grade progress tracking
- Learning outcome assessment
- Time management evaluation
- Weekly check-in questions
- Monthly review process

---

## 📊 Data Flow

```
1. User Input
   ↓
2. Parse Curriculum (parse_curriculum_pdf)
   ↓
3. Calculate Study Load (calculate_study_load)
   ↓
4. Generate Schedule (generate_daily_schedule)
   ↓
5. Adjust for Constraints (adjust_schedule)
   ↓
6. Export Format (export_schedule)
   ↓
7. User Gets Actionable Schedule
```

---

## 🚀 Usage Examples

### Example 1: Complete Workflow
```
User: "I'm a CS student with CGPA 2.8. I want to reach 3.5 in 8 weeks."

Agent:
1. Calls parse_curriculum_pdf → Gets course list
2. Calls calculate_study_load → Determines 25 hours/week needed
3. Calls generate_daily_schedule → Creates 8-week plan
4. Calls adjust_schedule → Accounts for 4-hour work commitment
5. Calls export_schedule → Exports as iCal for calendar sync

Result: Student has personalized schedule in their calendar
```

### Example 2: Quick Consultation
```
User: "What study techniques work best for STEM courses?"

Agent:
1. Reads study_methodologies resource
2. Reads course_difficulty_map resource
3. Recommends: Deep Work + Active Recall for math/physics
4. Suggests: Problem-solving focus for CS

Result: Student knows best techniques for their courses
```

### Example 3: Schedule Optimization
```
User: "My schedule is too intense. I work 6 hours daily."

Agent:
1. Calls adjust_schedule with work constraint
2. Reduces daily study hours from 6 to 3
3. Extends timeline from 8 to 12 weeks
4. Maintains target CGPA feasibility

Result: Realistic schedule that fits student's life
```

---

## 📋 Input/Output Schemas

### Course Schema
```typescript
{
  courseCode: string;        // "CS101"
  courseName: string;        // "Intro to CS"
  credits: number;           // 3
  currentGrade: number;      // 3.5 (0-4.0)
  difficulty: "easy" | "medium" | "hard";
}
```

### Study Load Schema
```typescript
{
  courseCode: string;
  courseName: string;
  currentGrade: number;
  targetGrade: number;
  hoursPerWeek: number;
  totalHours: number;
  priority: "low" | "medium" | "high";
}
```

### Time Block Schema
```typescript
{
  day: string;               // "Monday"
  startTime: string;         // "09:00"
  endTime: string;           // "10:30"
  courseCode: string;
  activity: string;          // "Study CS101"
  breakAfter?: boolean;
}
```

### Daily Schedule Schema
```typescript
{
  date: string;              // "2024-01-15"
  dayOfWeek: string;
  timeBlocks: TimeBlock[];
  totalStudyHours: number;
  breakMinutes: number;
}
```

### Weekly Schedule Schema
```typescript
{
  weekNumber: number;
  startDate: string;
  endDate: string;
  dailySchedules: DailySchedule[];
  totalWeeklyHours: number;
  milestones: string[];      // Exam dates
}
```

---

## 🎓 Study Methodology Recommendations

### By Course Type

**STEM Courses** (Math, Physics, CS)
- Primary: Deep Work + Active Recall
- Secondary: Spaced Repetition
- Focus: Problem-solving, practice problems
- Hours: 4-4.5 per credit

**Humanities** (Literature, History, Languages)
- Primary: Spaced Repetition + Active Recall
- Secondary: Feynman Technique
- Focus: Reading, discussion, writing
- Hours: 2.5-3.5 per credit

**Social Sciences** (Economics, Psychology)
- Primary: Active Recall + Case Studies
- Secondary: Interleaving
- Focus: Concepts, applications, discussions
- Hours: 2.5-3.0 per credit

**Arts** (Fine Arts, Music, Design)
- Primary: Practice + Feedback
- Secondary: Deep Work
- Focus: Hands-on creation, critique
- Hours: 2.0-3.0 per credit

---

## 💡 Best Practices

### Time Management
1. Use Pomodoro for focused sessions
2. Schedule during peak energy hours
3. Break large tasks into chunks
4. Use calendar/planner for tracking
5. Avoid multitasking

### Effective Studying
1. Use active recall (test yourself)
2. Apply spaced repetition
3. Teach others to solidify understanding
4. Use multiple resources
5. Create summaries and mind maps

### Health & Wellness
1. Get 7-9 hours sleep
2. Exercise regularly
3. Eat healthy meals
4. Take regular breaks
5. Practice mindfulness

### Exam Preparation
1. Start 2-3 weeks before
2. Review past exams
3. Form study groups
4. Get adequate sleep before exam
5. Arrive early, read instructions

---

## 🔧 Technical Details

### Module Structure
```
src/modules/studyschedule/
├── studyschedule.module.ts      # Module definition
├── studyschedule.tools.ts       # 5 tools
├── studyschedule.resources.ts   # 5 resources
└── studyschedule.prompts.ts     # 5 prompts
```

### Registration
The module is registered in `src/app.module.ts`:
```typescript
imports: [
  ConfigModule.forRoot(),
  CalculatorModule,
  StudyScheduleModule  // ← Registered here
]
```

### Tool Availability
All tools are available via MCP protocol:
- `parse_curriculum_pdf`
- `calculate_study_load`
- `generate_daily_schedule`
- `adjust_schedule`
- `export_schedule`

### Resource URIs
- `studyschedule://study-methodologies`
- `studyschedule://course-difficulty-map`
- `studyschedule://gpa-conversion`
- `studyschedule://sample-schedules`
- `studyschedule://study-tips`

---

## 📈 Expected Outcomes

### For Students
- ✅ Personalized study schedule
- ✅ Realistic GPA improvement timeline
- ✅ Optimized time management
- ✅ Reduced academic stress
- ✅ Better grades and GPA

### For Educators
- ✅ Data-driven student support
- ✅ Personalized intervention strategies
- ✅ Progress tracking capabilities
- ✅ Evidence-based recommendations

---

## 🔄 Workflow Summary

1. **Analyze** → Parse curriculum and assess current performance
2. **Calculate** → Determine study load needed
3. **Generate** → Create detailed schedule
4. **Adjust** → Optimize for constraints
5. **Export** → Share in preferred format
6. **Track** → Monitor progress and adjust as needed

---

## 📞 Support & Customization

### Extending the Agent
- Add more study methodologies
- Include additional course types
- Support different grading systems
- Add AI-powered recommendations
- Integrate with calendar APIs

### Future Enhancements
- PDF parsing with actual PDF libraries
- Machine learning for personalization
- Real-time progress tracking
- Peer study group matching
- Adaptive difficulty adjustment

---

## ✅ Verification Checklist

- [x] All 5 tools implemented and tested
- [x] All 5 resources created with comprehensive data
- [x] All 5 prompts designed for user guidance
- [x] Module registered in app.module.ts
- [x] TypeScript compilation clean
- [x] Smoke tests passing for all tools
- [x] Resources accessible via MCP protocol
- [x] Export formats working (JSON, CSV, iCal)
- [x] Schedule generation with time blocks
- [x] Constraint handling and optimization

---

## 🎉 Ready to Use!

The AI Study Schedule Agent is fully functional and ready for production use. Students can now:
- Upload their curriculum
- Set target GPA
- Get personalized study schedules
- Optimize based on constraints
- Export and track progress

**Start building better study habits today!**
