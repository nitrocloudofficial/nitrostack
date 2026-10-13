# AI Study Schedule Agent - Quick Reference

## 🎯 5 Tools at a Glance

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| **parse_curriculum_pdf** | Extract courses from PDF | PDF content, student name | Course list with grades |
| **calculate_study_load** | Compute hours needed | Curriculum, target CGPA, weeks, hours/day | Study load per course |
| **generate_daily_schedule** | Create study plan | Study loads, dates, times, breaks | Week-by-week schedule |
| **adjust_schedule** | Optimize for constraints | Schedule, work hours, days off, pace | Modified schedule |
| **export_schedule** | Export formats | Schedule, format (JSON/CSV/iCal) | Formatted schedule |

---

## 📚 5 Resources at a Glance

| Resource | Content | Use Case |
|----------|---------|----------|
| **study_methodologies** | 6 study techniques | Choose best method |
| **course_difficulty_map** | Subject effort estimates | Estimate hours needed |
| **gpa_conversion** | Grade-to-GPA tables | Convert grades |
| **sample_schedules** | Example templates | See best practices |
| **study_tips** | Evidence-based tips | Get guidance |

---

## 💬 5 Prompts at a Glance

| Prompt | Purpose | When to Use |
|--------|---------|------------|
| **analyze-curriculum** | Guide curriculum analysis | Starting out |
| **build-study-plan** | Structured planning | Creating plan |
| **optimize-schedule** | Refine schedule | Adjusting plan |
| **study-tips-motivation** | Provide guidance | Need help/motivation |
| **track-progress** | Monitor progress | Checking progress |

---

## 🚀 Quick Start

### 1. Analyze Your Curriculum
```
"Parse my curriculum with these courses:
- CS101 (3 credits, grade 3.5)
- MATH201 (4 credits, grade 3.0)
- ENG102 (3 credits, grade 3.8)"
```
→ Get structured course data

### 2. Calculate Study Load
```
"I have 8 weeks and can study 4 hours daily.
Calculate study load to reach 3.5 CGPA from 2.8."
```
→ Get hours needed per course

### 3. Generate Schedule
```
"Generate a 4-week schedule starting 2024-01-15,
studying 09:00-17:00 with 15-minute breaks."
```
→ Get detailed daily schedule

### 4. Adjust for Constraints
```
"I work 4 hours daily and want weekends off.
Adjust my schedule with normal learning pace."
```
→ Get optimized schedule

### 5. Export Schedule
```
"Export my schedule as iCal for calendar sync."
```
→ Get calendar-ready schedule

---

## 📊 Study Load Priority Levels

| Priority | Grade Gap | Meaning |
|----------|-----------|---------|
| **HIGH** | > 0.5 | Needs significant improvement |
| **MEDIUM** | 0.2 - 0.5 | Moderate improvement needed |
| **LOW** | < 0.2 | Minimal improvement needed |

---

## ⏱️ Recommended Study Hours by Subject

| Subject Type | Hours/Credit | Difficulty |
|--------------|-------------|-----------|
| Mathematics | 4.5 | Hard |
| Physics | 4.0 | Hard |
| Computer Science | 4.2 | Hard |
| Chemistry | 3.8 | Hard |
| Biology | 3.5 | Medium |
| Economics | 3.0 | Medium |
| Languages | 3.5 | Medium |
| Literature | 2.8 | Medium |
| History | 2.5 | Medium |
| Psychology | 2.5 | Easy |
| Fine Arts | 2.0 | Easy |

---

## 🎓 Study Techniques by Subject

| Subject | Primary Method | Secondary Method |
|---------|----------------|------------------|
| **Math** | Deep Work | Active Recall |
| **Physics** | Problem-solving | Spaced Repetition |
| **CS** | Hands-on coding | Deep Work |
| **Chemistry** | Lab work | Visualization |
| **Biology** | Memorization | Visualization |
| **Languages** | Immersion | Spaced Repetition |
| **Literature** | Reading | Discussion |
| **History** | Timeline | Spaced Repetition |
| **Economics** | Problem-solving | Case studies |
| **Psychology** | Reading | Discussion |

---

## 📅 Schedule Templates

### Full-Time Student
- Daily: 6 hours
- Weekly: 30 hours
- Best for: No work commitments

### Working Student
- Daily: 3 hours
- Weekly: 15 hours
- Best for: Part-time work (20 hrs/week)

### Exam Prep
- Daily: 8 hours
- Weekly: 56 hours
- Best for: 4 weeks before exam

### Balanced
- Daily: 4 hours
- Weekly: 20 hours
- Best for: Work + study balance

---

## 🔄 Typical Workflow

```
1. Analyze Curriculum
   ↓
2. Calculate Study Load
   ↓
3. Generate Schedule
   ↓
4. Adjust for Constraints
   ↓
5. Export Schedule
   ↓
6. Track Progress
   ↓
7. Optimize as Needed
```

---

## 💡 Pro Tips

### Time Management
- Use Pomodoro: 25 min focus + 5 min break
- Study during peak energy hours
- Break tasks into smaller chunks
- Avoid multitasking

### Effective Studying
- Test yourself frequently (Active Recall)
- Review at intervals (Spaced Repetition)
- Teach others to solidify understanding
- Use multiple resources

### Health & Wellness
- Get 7-9 hours sleep
- Exercise regularly
- Eat healthy meals
- Take regular breaks

### Exam Prep
- Start 2-3 weeks before
- Review past exams
- Form study groups
- Get adequate sleep

---

## 📈 GPA Conversion Quick Reference

### US 4.0 Scale
- A+ (97-100) = 4.0
- A (93-96) = 4.0
- A- (90-92) = 3.7
- B+ (87-89) = 3.3
- B (83-86) = 3.0
- B- (80-82) = 2.7
- C+ (77-79) = 2.3
- C (73-76) = 2.0
- D+ (67-69) = 1.3
- D (63-66) = 1.0
- F (0-59) = 0.0

---

## 🎯 CGPA Improvement Timeline

| Current CGPA | Target CGPA | Weeks Needed | Hours/Week |
|--------------|-------------|--------------|-----------|
| 2.0 | 3.0 | 8 | 20 |
| 2.5 | 3.5 | 8 | 25 |
| 2.8 | 3.5 | 8 | 22 |
| 3.0 | 3.8 | 10 | 18 |
| 3.2 | 3.9 | 12 | 15 |

*Estimates based on 5 courses with mixed difficulty*

---

## ✅ Checklist Before Starting

- [ ] Know your current CGPA
- [ ] Know your target CGPA
- [ ] List all your courses
- [ ] Know your current grades
- [ ] Determine available study hours/day
- [ ] Identify work/other commitments
- [ ] Choose preferred study techniques
- [ ] Set exam dates
- [ ] Decide export format preference

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Schedule too intense | Reduce daily hours or extend timeline |
| Not enough time | Increase study hours or lower target |
| Losing motivation | Track progress, celebrate wins |
| Procrastinating | Break tasks into smaller steps |
| Overwhelmed | Adjust learning pace to slow |
| Falling behind | Increase priority courses |
| Grades not improving | Try different study techniques |

---

## 📞 Support Resources

- **Study Tips**: Read study_tips resource
- **Methodologies**: Check study_methodologies resource
- **Difficulty Estimates**: See course_difficulty_map resource
- **GPA Conversion**: Use gpa_conversion resource
- **Sample Schedules**: View sample_schedules resource

---

## 🎉 Success Metrics

Track these to measure success:

- [ ] Following schedule 80%+ of the time
- [ ] Grades improving each week
- [ ] Feeling more confident in material
- [ ] Scoring well on practice problems
- [ ] Reaching target CGPA
- [ ] Maintaining work-life balance
- [ ] Reduced academic stress

---

**Ready to improve your GPA? Start with Step 1: Analyze Your Curriculum!**
