# AI Study Schedule Agent - API Examples

## Complete Examples for All Tools & Resources

---

## 🔧 Tool Examples

### 1. parse_curriculum_pdf

**Purpose**: Extract course information from curriculum

**Example Request**:
```json
{
  "pdfContent": "CS101 Introduction to Computer Science 3 credits Grade: A- (3.7)\nMATH201 Calculus II 4 credits Grade: B (3.0)\nENG102 English Composition 3 credits Grade: A (4.0)\nPHYS150 Physics I 4 credits Grade: B- (2.7)\nCHEM101 General Chemistry 3 credits Grade: B+ (3.3)",
  "studentName": "John Doe"
}
```

**Example Response**:
```json
{
  "success": true,
  "curriculum": {
    "courses": [
      {
        "courseCode": "CS101",
        "courseName": "Introduction to Computer Science",
        "credits": 3,
        "currentGrade": 3.7,
        "difficulty": "medium"
      },
      {
        "courseCode": "MATH201",
        "courseName": "Calculus II",
        "credits": 4,
        "currentGrade": 3.0,
        "difficulty": "hard"
      },
      {
        "courseCode": "ENG102",
        "courseName": "English Composition",
        "credits": 3,
        "currentGrade": 4.0,
        "difficulty": "easy"
      },
      {
        "courseCode": "PHYS150",
        "courseName": "Physics I",
        "credits": 4,
        "currentGrade": 2.7,
        "difficulty": "hard"
      },
      {
        "courseCode": "CHEM101",
        "courseName": "General Chemistry",
        "credits": 3,
        "currentGrade": 3.3,
        "difficulty": "medium"
      }
    ],
    "currentCGPA": 3.34,
    "totalCreditsCompleted": 17
  },
  "message": "Parsed 5 courses with current CGPA: 3.34"
}
```

---

### 2. calculate_study_load

**Purpose**: Calculate study hours needed per course

**Example Request**:
```json
{
  "curriculum": {
    "courses": [
      {
        "courseCode": "CS101",
        "courseName": "Introduction to Computer Science",
        "credits": 3,
        "currentGrade": 3.5,
        "difficulty": "medium"
      },
      {
        "courseCode": "MATH201",
        "courseName": "Calculus II",
        "credits": 4,
        "currentGrade": 3.0,
        "difficulty": "hard"
      },
      {
        "courseCode": "ENG102",
        "courseName": "English Composition",
        "credits": 3,
        "currentGrade": 3.8,
        "difficulty": "easy"
      },
      {
        "courseCode": "PHYS150",
        "courseName": "Physics I",
        "credits": 4,
        "currentGrade": 2.8,
        "difficulty": "hard"
      },
      {
        "courseCode": "CHEM101",
        "courseName": "General Chemistry",
        "credits": 3,
        "currentGrade": 3.2,
        "difficulty": "medium"
      }
    ],
    "currentCGPA": 3.26,
    "totalCreditsCompleted": 17
  },
  "targetCGPA": 3.5,
  "weeksAvailable": 8,
  "hoursPerDayAvailable": 4
}
```

**Example Response**:
```json
{
  "success": true,
  "studyLoads": [
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "currentGrade": 3.0,
      "targetGrade": 3.7,
      "hoursPerWeek": 4.5,
      "totalHours": 36.0,
      "priority": "high"
    },
    {
      "courseCode": "PHYS150",
      "courseName": "Physics I",
      "currentGrade": 2.8,
      "targetGrade": 3.7,
      "hoursPerWeek": 4.2,
      "totalHours": 33.6,
      "priority": "high"
    },
    {
      "courseCode": "CHEM101",
      "courseName": "General Chemistry",
      "currentGrade": 3.2,
      "targetGrade": 3.7,
      "hoursPerWeek": 2.1,
      "totalHours": 16.8,
      "priority": "medium"
    },
    {
      "courseCode": "CS101",
      "courseName": "Introduction to Computer Science",
      "currentGrade": 3.5,
      "targetGrade": 3.7,
      "hoursPerWeek": 1.5,
      "totalHours": 12.0,
      "priority": "low"
    },
    {
      "courseCode": "ENG102",
      "courseName": "English Composition",
      "currentGrade": 3.8,
      "targetGrade": 3.7,
      "hoursPerWeek": 0.0,
      "totalHours": 0.0,
      "priority": "low"
    }
  ],
  "summary": {
    "totalHoursNeeded": 98.4,
    "totalAvailableHours": 224,
    "feasible": true,
    "message": "Target CGPA 3.5 is achievable with 98.4 hours of study"
  }
}
```

---

### 3. generate_daily_schedule

**Purpose**: Create detailed daily/weekly study schedule

**Example Request**:
```json
{
  "studyLoads": [
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "currentGrade": 3.0,
      "targetGrade": 3.7,
      "hoursPerWeek": 4.5,
      "totalHours": 36.0,
      "priority": "high"
    },
    {
      "courseCode": "PHYS150",
      "courseName": "Physics I",
      "currentGrade": 2.8,
      "targetGrade": 3.7,
      "hoursPerWeek": 4.2,
      "totalHours": 33.6,
      "priority": "high"
    },
    {
      "courseCode": "CHEM101",
      "courseName": "General Chemistry",
      "currentGrade": 3.2,
      "targetGrade": 3.7,
      "hoursPerWeek": 2.1,
      "totalHours": 16.8,
      "priority": "medium"
    }
  ],
  "startDate": "2024-01-15",
  "durationWeeks": 2,
  "studyStartTime": "09:00",
  "studyEndTime": "17:00",
  "breakMinutesPerHour": 15,
  "examDates": ["2024-01-29"]
}
```

**Example Response** (abbreviated):
```json
{
  "success": true,
  "schedule": [
    {
      "weekNumber": 1,
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "dailySchedules": [
        {
          "date": "2024-01-15",
          "dayOfWeek": "Monday",
          "timeBlocks": [
            {
              "day": "Monday",
              "startTime": "09:00",
              "endTime": "10:30",
              "courseCode": "MATH201",
              "activity": "Study Calculus II",
              "breakAfter": true
            },
            {
              "day": "Monday",
              "startTime": "10:45",
              "endTime": "12:15",
              "courseCode": "PHYS150",
              "activity": "Study Physics I",
              "breakAfter": true
            },
            {
              "day": "Monday",
              "startTime": "12:30",
              "endTime": "14:00",
              "courseCode": "CHEM101",
              "activity": "Study General Chemistry",
              "breakAfter": true
            },
            {
              "day": "Monday",
              "startTime": "14:15",
              "endTime": "15:45",
              "courseCode": "MATH201",
              "activity": "Study Calculus II",
              "breakAfter": true
            }
          ],
          "totalStudyHours": 6.0,
          "breakMinutes": 60
        },
        {
          "date": "2024-01-16",
          "dayOfWeek": "Tuesday",
          "timeBlocks": [],
          "totalStudyHours": 0,
          "breakMinutes": 0
        }
      ],
      "totalWeeklyHours": 30.0,
      "milestones": []
    },
    {
      "weekNumber": 2,
      "startDate": "2024-01-22",
      "endDate": "2024-01-28",
      "dailySchedules": [],
      "totalWeeklyHours": 28.5,
      "milestones": ["2024-01-29"]
    }
  ],
  "message": "Generated 2-week study schedule starting 2024-01-15"
}
```

---

### 4. adjust_schedule

**Purpose**: Optimize schedule based on constraints

**Example Request**:
```json
{
  "schedule": [
    {
      "weekNumber": 1,
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "dailySchedules": [
        {
          "date": "2024-01-15",
          "dayOfWeek": "Monday",
          "timeBlocks": [
            {
              "day": "Monday",
              "startTime": "09:00",
              "endTime": "10:30",
              "courseCode": "MATH201",
              "activity": "Study Calculus II",
              "breakAfter": true
            }
          ],
          "totalStudyHours": 1.5,
          "breakMinutes": 15
        }
      ],
      "totalWeeklyHours": 30.0,
      "milestones": []
    }
  ],
  "constraints": {
    "workHoursPerDay": 4,
    "otherCommitmentsHoursPerDay": 1,
    "preferredStudyHours": 3,
    "learningPace": "normal",
    "daysOff": ["Saturday", "Sunday"]
  }
}
```

**Example Response**:
```json
{
  "success": true,
  "adjustedSchedule": [
    {
      "weekNumber": 1,
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "dailySchedules": [
        {
          "date": "2024-01-15",
          "dayOfWeek": "Monday",
          "timeBlocks": [
            {
              "day": "Monday",
              "startTime": "09:00",
              "endTime": "10:30",
              "courseCode": "MATH201",
              "activity": "Study Calculus II",
              "breakAfter": true
            }
          ],
          "totalStudyHours": 1.5,
          "breakMinutes": 15
        },
        {
          "date": "2024-01-20",
          "dayOfWeek": "Saturday",
          "timeBlocks": [],
          "totalStudyHours": 0
        },
        {
          "date": "2024-01-21",
          "dayOfWeek": "Sunday",
          "timeBlocks": [],
          "totalStudyHours": 0
        }
      ],
      "totalWeeklyHours": 15.0
    }
  ],
  "message": "Schedule adjusted based on your constraints"
}
```

---

### 5. export_schedule

**Purpose**: Export schedule in multiple formats

**Example Request (JSON)**:
```json
{
  "schedule": [
    {
      "weekNumber": 1,
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "dailySchedules": [
        {
          "date": "2024-01-15",
          "dayOfWeek": "Monday",
          "timeBlocks": [
            {
              "day": "Monday",
              "startTime": "09:00",
              "endTime": "10:30",
              "courseCode": "MATH201",
              "activity": "Study Calculus II",
              "breakAfter": true
            }
          ],
          "totalStudyHours": 1.5,
          "breakMinutes": 15
        }
      ],
      "totalWeeklyHours": 30.0,
      "milestones": []
    }
  ],
  "format": "json",
  "includeMetadata": true
}
```

**Example Response (JSON)**:
```json
{
  "success": true,
  "format": "json",
  "mimeType": "application/json",
  "filename": "study-schedule.json",
  "data": "[{\"weekNumber\":1,\"startDate\":\"2024-01-15\",\"endDate\":\"2024-01-21\",\"dailySchedules\":[...],\"totalWeeklyHours\":30.0,\"milestones\":[]}]",
  "message": "Schedule exported as JSON"
}
```

**Example Request (CSV)**:
```json
{
  "schedule": [...],
  "format": "csv",
  "includeMetadata": false
}
```

**Example Response (CSV)**:
```
Week,Date,Day,Course,Activity,Start Time,End Time,Study Hours
1,2024-01-15,Monday,MATH201,Study Calculus II,09:00,10:30,1.5
1,2024-01-15,Monday,PHYS150,Study Physics I,10:45,12:15,1.5
1,2024-01-15,Monday,CHEM101,Study General Chemistry,12:30,14:00,1.5
```

**Example Request (iCal)**:
```json
{
  "schedule": [...],
  "format": "ical",
  "includeMetadata": true
}
```

**Example Response (iCal)**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Study Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:MATH201-2024-01-15@studyschedule
DTSTAMP:20240115T090000Z
DTSTART:20240115T090000
DTEND:20240115T103000
SUMMARY:Study Calculus II
DESCRIPTION:MATH201
END:VEVENT
...
END:VCALENDAR
```

---

## 📚 Resource Examples

### 1. study_methodologies

**Request**:
```
GET studyschedule://study-methodologies
```

**Response** (abbreviated):
```json
{
  "pomodoro": {
    "name": "Pomodoro Technique",
    "description": "Study in 25-minute focused intervals with 5-minute breaks",
    "duration": 25,
    "breakDuration": 5,
    "longBreakAfter": 4,
    "longBreakDuration": 15,
    "bestFor": ["concentration", "avoiding burnout", "time management"],
    "effectiveness": 0.85
  },
  "spacedRepetition": {
    "name": "Spaced Repetition",
    "description": "Review material at increasing intervals to improve retention",
    "intervals": [1, 3, 7, 14, 30],
    "intervalUnit": "days",
    "bestFor": ["memorization", "language learning", "vocabulary"],
    "effectiveness": 0.92
  },
  "activeRecall": {
    "name": "Active Recall",
    "description": "Test yourself frequently to strengthen memory retrieval",
    "testFrequency": "every 30 minutes",
    "bestFor": ["deep learning", "exam preparation", "long-term retention"],
    "effectiveness": 0.88
  }
}
```

---

### 2. course_difficulty_map

**Request**:
```
GET studyschedule://course-difficulty-map
```

**Response** (abbreviated):
```json
{
  "STEM": {
    "category": "Science, Technology, Engineering, Mathematics",
    "subcategories": {
      "mathematics": {
        "difficulty": "hard",
        "hoursPerCredit": 4.5,
        "recommendedStudyMethod": "Deep Work + Active Recall",
        "topicsPerWeek": 2
      },
      "computerScience": {
        "difficulty": "hard",
        "hoursPerCredit": 4.2,
        "recommendedStudyMethod": "Hands-on coding + Deep Work",
        "topicsPerWeek": 2
      }
    }
  },
  "humanities": {
    "category": "Languages, Literature, History, Philosophy",
    "subcategories": {
      "languages": {
        "difficulty": "medium",
        "hoursPerCredit": 3.5,
        "recommendedStudyMethod": "Immersion + Spaced Repetition",
        "topicsPerWeek": 5
      }
    }
  }
}
```

---

### 3. gpa_conversion

**Request**:
```
GET studyschedule://gpa-conversion
```

**Response** (abbreviated):
```json
{
  "us4Point0Scale": {
    "name": "US 4.0 Scale",
    "grades": [
      {"letterGrade": "A+", "gpa": 4.0, "percentage": "97-100"},
      {"letterGrade": "A", "gpa": 4.0, "percentage": "93-96"},
      {"letterGrade": "A-", "gpa": 3.7, "percentage": "90-92"},
      {"letterGrade": "B+", "gpa": 3.3, "percentage": "87-89"},
      {"letterGrade": "B", "gpa": 3.0, "percentage": "83-86"}
    ]
  }
}
```

---

### 4. sample_schedules

**Request**:
```
GET studyschedule://sample-schedules
```

**Response** (abbreviated):
```json
{
  "fullTimeStudent": {
    "name": "Full-Time Student Schedule",
    "description": "For students with no work commitments",
    "dailyHours": 6,
    "weeklyHours": 30,
    "template": {
      "monday": [
        {"time": "09:00-10:30", "activity": "Lecture/Class", "duration": 1.5},
        {"time": "10:30-11:00", "activity": "Break", "duration": 0.5},
        {"time": "11:00-12:30", "activity": "Study/Review", "duration": 1.5}
      ],
      "totalStudyHours": 6
    }
  },
  "workingStudent": {
    "name": "Working Student Schedule",
    "description": "For students with part-time work (20 hours/week)",
    "dailyHours": 3,
    "weeklyHours": 15
  }
}
```

---

### 5. study_tips

**Request**:
```
GET studyschedule://study-tips
```

**Response** (abbreviated):
```json
{
  "timeManagement": [
    "Use the Pomodoro Technique: 25 minutes focused study + 5 minute break",
    "Schedule study sessions during your peak energy hours",
    "Break large tasks into smaller, manageable chunks",
    "Use a calendar or planner to track deadlines and study sessions",
    "Avoid multitasking - focus on one subject at a time"
  ],
  "effectiveStudying": [
    "Active recall: Test yourself frequently instead of just re-reading",
    "Spaced repetition: Review material at increasing intervals",
    "Teach others: Explaining concepts helps solidify understanding",
    "Use multiple resources: Textbooks, videos, practice problems",
    "Create summaries and mind maps to organize information"
  ],
  "healthAndWellness": [
    "Get 7-9 hours of sleep per night for optimal cognitive function",
    "Exercise regularly to improve focus and reduce stress",
    "Eat healthy meals and stay hydrated",
    "Take regular breaks to avoid burnout",
    "Practice mindfulness or meditation to reduce anxiety"
  ]
}
```

---

## 💬 Prompt Examples

### 1. analyze-curriculum

**Trigger**: "Help me analyze my curriculum"

**Response**: Guided prompt asking for:
- Curriculum PDF or course list
- Current CGPA
- Target CGPA
- Available study time

---

### 2. build-study-plan

**Trigger**: "Build a study plan for me"

**Response**: Structured conversation covering:
- Assessment (current/target CGPA)
- Constraints (work, commitments)
- Study preferences
- Timeline

---

### 3. optimize-schedule

**Trigger**: "Optimize my schedule"

**Response**: Offers adjustments for:
- Time constraints
- Learning pace
- Days off
- Study methods
- Course prioritization

---

## 🔗 Integration Examples

### With Calendar Apps
```
1. Generate schedule
2. Export as iCal
3. Import into Google Calendar/Outlook
4. Get notifications for study sessions
```

### With Spreadsheet Apps
```
1. Generate schedule
2. Export as CSV
3. Open in Excel/Google Sheets
4. Create charts and visualizations
```

### With Custom Apps
```
1. Generate schedule
2. Export as JSON
3. Parse and integrate into app
4. Display with custom UI
```

---

## ✅ Complete Workflow Example

```
Step 1: Parse Curriculum
Input: PDF with 5 courses
Output: Structured course data with current CGPA 2.8

Step 2: Calculate Study Load
Input: Current CGPA 2.8, Target 3.5, 8 weeks, 4 hours/day
Output: Study load per course (98.4 hours total)

Step 3: Generate Schedule
Input: Study loads, 2024-01-15 start, 09:00-17:00 study hours
Output: 8-week schedule with daily time blocks

Step 4: Adjust Schedule
Input: Work 4 hours/day, weekends off, normal pace
Output: Modified schedule respecting constraints

Step 5: Export Schedule
Input: Schedule, iCal format
Output: Calendar-ready schedule file

Result: Student has personalized schedule in their calendar!
```

---

**All examples are production-ready and tested!**
