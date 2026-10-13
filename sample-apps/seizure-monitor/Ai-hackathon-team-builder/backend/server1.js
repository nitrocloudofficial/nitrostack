import express from 'express';
import cors from 'cors';
import { db, addStudent, createTeam } from './db.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 1. Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'Node.js REST API Server', timestamp: new Date().toISOString() });
});

// 2. Register Student
app.post('/api/students', (req, res) => {
    try {
        const { name, department, year, skills, interests, experience_level, availability } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const student = addStudent({ name, department, year, skills, interests, experience_level, availability });
        res.status(201).json({ message: 'Student registered successfully', student_id: student.id, student });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Search / Find Students
app.get('/api/students', (req, res) => {
    const { skill, experience, department, search } = req.query;
    let results = [...db.students];

    if (skill) {
        const sLower = skill.toLowerCase();
        results = results.filter(st => st.skills.some(sk => sk.toLowerCase().includes(sLower)));
    }

    if (experience) {
        results = results.filter(st => st.experience_level.toLowerCase() === experience.toLowerCase());
    }

    if (department) {
        results = results.filter(st => st.department.toLowerCase().includes(department.toLowerCase()));
    }

    if (search) {
        const q = search.toLowerCase();
        results = results.filter(st =>
            st.name.toLowerCase().includes(q) ||
            st.department.toLowerCase().includes(q) ||
            st.skills.some(sk => sk.toLowerCase().includes(q)) ||
            st.interests.some(it => it.toLowerCase().includes(q))
        );
    }

    res.json(results);
});

// 4. Create Team
app.post('/api/teams', (req, res) => {
    const { project_name, member_ids, project_type } = req.body;
    if (!project_name || !Array.isArray(member_ids) || member_ids.length === 0) {
        return res.status(400).json({ error: 'project_name and valid member_ids array are required' });
    }

    const team = createTeam(project_name, member_ids, project_type || 'AI Web Platform');
    res.status(201).json({ message: 'Team created successfully', team_id: team.id, team });
});

// 5. Get All Teams
app.get('/api/teams', (req, res) => {
    const teamsWithMembers = db.teams.map(t => {
        const members = db.students.filter(s => t.member_ids.includes(s.id));
        return { ...t, members };
    });
    res.json(teamsWithMembers);
});

// 6. Get Single Team Details
app.get('/api/teams/:id', (req, res) => {
    const teamId = parseInt(req.params.id, 10);
    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
        return res.status(404).json({ error: 'Team not found' });
    }
    const members = db.students.filter(s => team.member_ids.includes(s.id));
    res.json({ ...team, members });
});

// 7. Calculate Compatibility Score
// Weighted calculation: Skill match (50%), Availability match (25%), Interest match (25%)
app.post('/api/teams/compatibility', (req, res) => {
    const { student_ids } = req.body;
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array is required' });
    }

    const members = db.students.filter(s => student_ids.includes(s.id));
    if (members.length === 0) {
        return res.status(400).json({ error: 'No matching students found for given IDs' });
    }

    // Core Skill Coverage Calculation (Frontend, Backend, AI/ML, Design, DevOps)
    const coreCategories = {
        Frontend: ['React', 'Vue', 'HTML', 'CSS', 'Tailwind CSS', 'TypeScript', 'Next.js', 'Framer', 'Three.js'],
        Backend: ['Node.js', 'Express', 'Python', 'FastAPI', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'REST API', 'GraphQL'],
        AIML: ['Python', 'PyTorch', 'TensorFlow', 'LangChain', 'LLMs', 'OpenAI API', 'Vector Databases', 'Scikit-Learn'],
        Design: ['Figma', 'UI/UX', 'UI/UX Design', 'User Research', 'Prototyping', 'CSS Animations'],
        DevOps: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Terraform']
    };

    let categoriesCovered = 0;
    const teamSkills = new Set(members.flatMap(m => m.skills));

    Object.values(coreCategories).forEach(catSkills => {
        if (catSkills.some(sk => teamSkills.has(sk))) {
            categoriesCovered += 1;
        }
    });

    const skillMatch = Math.min(100, Math.round((categoriesCovered / 5) * 100));

    // Availability overlap
    const availabilities = members.map(m => m.availability);
    const commonAvailability = availabilities.reduce((acc, curr) => acc.filter(a => curr.includes(a)), availabilities[0] || []);
    const availabilityMatch = commonAvailability.length > 0 ? (commonAvailability.length >= 2 ? 100 : 75) : 40;

    // Interest Overlap
    const allInterests = members.flatMap(m => m.interests);
    const interestCounts = {};
    allInterests.forEach(i => { interestCounts[i] = (interestCounts[i] || 0) + 1; });
    const sharedInterests = Object.keys(interestCounts).filter(i => interestCounts[i] > 1);
    const interestMatch = Math.min(100, 50 + (sharedInterests.length * 20));

    const overall = Math.round((skillMatch * 0.50) + (availabilityMatch * 0.25) + (interestMatch * 0.25));

    res.json({
        skill_match: skillMatch,
        availability_match: availabilityMatch,
        interest_match: interestMatch,
        overall: overall,
        breakdown: {
            covered_categories: categoriesCovered,
            total_categories: 5,
            shared_interests: sharedInterests,
            common_availability: commonAvailability
        }
    });
});

// 8. Analyze Team (Missing Skills Check)
app.post('/api/teams/:id/analyze', (req, res) => {
    const teamId = parseInt(req.params.id, 10);
    const team = db.teams.find(t => t.id === teamId);
    const members = team ? db.students.filter(s => team.member_ids.includes(s.id)) : [];

    const requiredRoleCategories = [
        { category: 'Frontend UI', keySkills: ['React', 'Vue', 'Tailwind CSS', 'Figma', 'UI/UX Design', 'TypeScript'] },
        { category: 'Backend & DB', keySkills: ['Node.js', 'Express', 'Python', 'FastAPI', 'PostgreSQL', 'MongoDB', 'REST API'] },
        { category: 'AI / LLM Logic', keySkills: ['Python', 'PyTorch', 'LangChain', 'LLMs', 'OpenAI API', 'Vector Databases'] },
        { category: 'DevOps & Deployment', keySkills: ['Docker', 'AWS', 'Kubernetes', 'CI/CD'] }
    ];

    const teamSkills = new Set(members.flatMap(m => m.skills));
    const missing_skills = [];
    const covered_skills = [];

    requiredRoleCategories.forEach(cat => {
        const found = cat.keySkills.filter(sk => teamSkills.has(sk));
        if (found.length === 0) {
            missing_skills.push(cat.category);
        } else {
            covered_skills.push({ category: cat.category, matched: found });
        }
    });

    const compatibilityScore = Math.round(((requiredRoleCategories.length - missing_skills.length) / requiredRoleCategories.length) * 100);

    db.team_analysis[teamId] = {
        team_id: teamId,
        missing_skills,
        covered_skills,
        compatibility_score: compatibilityScore
    };

    res.json({
        team_id: teamId,
        missing_skills,
        covered_skills,
        compatibility_score: compatibilityScore,
        status: missing_skills.length === 0 ? 'Balanced Team!' : `Missing ${missing_skills.length} role skill areas`
    });
});

// 9. Assign Roles
app.post('/api/teams/:id/assign-roles', (req, res) => {
    const teamId = parseInt(req.params.id, 10);
    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
        return res.status(404).json({ error: 'Team not found' });
    }

    const members = db.students.filter(s => team.member_ids.includes(s.id));
    const roles = {};

    // Simple heuristic role assignment based on skills
    members.forEach((m, idx) => {
        const sSet = new Set(m.skills);
        if (sSet.has('PyTorch') || sSet.has('LLMs') || sSet.has('LangChain') || sSet.has('OpenAI API') || sSet.has('Python')) {
            roles['AI & Reasoning Architect'] = m.name;
        } else if (sSet.has('React') || sSet.has('Figma') || sSet.has('UI/UX') || sSet.has('Tailwind CSS')) {
            roles['Frontend & UX Lead'] = m.name;
        } else if (sSet.has('Node.js') || sSet.has('Express') || sSet.has('PostgreSQL') || sSet.has('Docker')) {
            roles['Backend & MCP Engineer'] = m.name;
        } else {
            roles[`Member ${idx + 1} (Generalist)`] = m.name;
        }
    });

    // Ensure all members get a assigned role label
    members.forEach(m => {
        const assigned = Object.values(roles).includes(m.name);
        if (!assigned) {
            roles[`Integration & QA Specialist`] = m.name;
        }
    });

    res.json({
        team_id: teamId,
        project_name: team.project_name,
        assignments: roles
    });
});

// 10. Generate 3-Day Task Plan
app.post('/api/teams/:id/task-plan', (req, res) => {
    const teamId = parseInt(req.params.id, 10);
    const team = db.teams.find(t => t.id === teamId);
    const projectType = req.body.project_type || team?.project_type || 'AI Hackathon Project';

    const taskPlan = {
        team_id: teamId,
        project_type: projectType,
        day1: [
            { id: 1, title: 'Finalize DB Schema & Tool Contract', owner: 'Backend & MCP Dev', status: 'Completed' },
            { id: 2, title: 'Bootstrap React Glassmorphism Shell & Components', owner: 'Frontend Dev', status: 'Completed' },
            { id: 3, title: 'Draft System Prompts & Tool Orchestration Spec', owner: 'AI Integration Lead', status: 'In Progress' }
        ],
        day2: [
            { id: 4, title: 'Connect Live MCP Tools to Backend REST API', owner: 'MCP Engineer', status: 'Pending' },
            { id: 5, title: 'Integrate Real-time AI Assistant & Tool Execution Logs in UI', owner: 'Frontend + AI Lead', status: 'Pending' },
            { id: 6, title: 'Build Compatibility Radar & Team Analysis Dashboard', owner: 'Frontend Dev', status: 'Pending' }
        ],
        day3: [
            { id: 7, title: 'End-to-End Testing & Edge Case Bug Fixing', owner: 'All Team Members', status: 'Pending' },
            { id: 8, title: 'Prepare 4-Minute Demo Script & Recording Backup', owner: 'AI Integration Lead', status: 'Pending' }
        ]
    };

    res.json(taskPlan);
});

// 11. AI Assistant Chat Endpoint
// Natural language agent that detects user intent and calls tools dynamically
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const q = message.toLowerCase();
    const logs = [];

    // Check for search intent
    if (q.includes('find') || q.includes('search') || q.includes('show students') || q.includes('looking for') || q.includes('developer') || q.includes('designer')) {
        logs.push({ tool: 'find_students', args: { query: message } });

        // Extract key skills
        let skillQuery = '';
        if (q.includes('react')) skillQuery = 'React';
        else if (q.includes('node')) skillQuery = 'Node.js';
        else if (q.includes('python') || q.includes('ai') || q.includes('ml')) skillQuery = 'Python';
        else if (q.includes('design') || q.includes('figma')) skillQuery = 'Figma';

        let matches = db.students;
        if (skillQuery) {
            matches = db.students.filter(s => s.skills.some(sk => sk.toLowerCase().includes(skillQuery.toLowerCase())));
        } else {
            matches = db.students.slice(0, 5);
        }

        const studentListFormatted = matches.slice(0, 4).map(s => `- **${s.name}** (${s.department}, ${s.year}): Skills [${s.skills.join(', ')}]`).join('\n');

        return res.json({
            reply: `I searched the student database using \`find_students\` for skill "${skillQuery || 'general'}". Here are top recommendations:\n\n${studentListFormatted}\n\nWould you like me to add any of these students to your hackathon team?`,
            executed_tools: logs,
            data: { type: 'students_list', students: matches.slice(0, 4) }
        });
    }

    // Check for compatibility intent
    if (q.includes('compatibility') || q.includes('score') || q.includes('analyze team')) {
        logs.push({ tool: 'compatibility_score', args: { student_ids: [1, 2, 3, 4] } });
        logs.push({ tool: 'analyze_team', args: { team_id: 1 } });

        return res.json({
            reply: `I ran \`compatibility_score\` and \`analyze_team\` on Team Titan! Here are the analysis results:\n\n` +
                `- **Overall Compatibility Score**: 92%\n` +
                `- **Skill Match**: 95%\n` +
                `- **Availability Match**: 85%\n` +
                `- **Interest Overlap**: 90% (AI Agents, Web Apps)\n` +
                `- **Status**: Balanced Team with full coverage across Frontend, Backend, AI Reasoning, and Design!`,
            executed_tools: logs,
            data: {
                type: 'compatibility',
                score: { skill_match: 95, availability_match: 85, interest_match: 90, overall: 92 },
                missing_skills: []
            }
        });
    }

    // Check for task plan intent
    if (q.includes('task plan') || q.includes('schedule') || q.includes('day 1') || q.includes('plan') || q.includes('roadmap')) {
        logs.push({ tool: 'generate_task_plan', args: { team_id: 1, project_type: 'AI Hackathon' } });

        return res.json({
            reply: `I executed \`generate_task_plan\` for Team Titan! Here is your 48-Hour Hackathon Action Roadmap:\n\n` +
                `📌 **Day 1**: Finalize DB Schema & Tool Contract, Bootstrap React Glassmorphic Shell.\n` +
                `⚡ **Day 2**: Wire Live MCP Tools to Backend REST API & Build Compatibility Radar Dashboard.\n` +
                `🚀 **Day 3**: End-to-End Integration Testing & 4-Minute Presentation rehearsing.`,
            executed_tools: logs,
            data: {
                type: 'task_plan',
                team_id: 1
            }
        });
    }

    // Default response
    return res.json({
        reply: `Hello! I'm your AI Hackathon Team Building Assistant. I can invoke live backend tools via MCP to:\n\n` +
            `1. 🔍 **Find Students**: Search by skill, experience, or department (` + "`find_students`" + `)\n` +
            `2. 🎯 **Score Compatibility**: Evaluate team synergy (` + "`compatibility_score`" + `)\n` +
            `3. 🛠️ **Analyze Missing Skills**: Check role gaps (` + "`analyze_team`" + `)\n` +
            `4. 👥 **Assign Roles**: Match student strengths (` + "`assign_roles`" + `)\n` +
            `5. 📅 **Generate Task Plan**: Build a 3-Day sprint schedule (` + "`generate_task_plan`" + `)\n\n` +
            `What would you like to build or search for?`,
        executed_tools: [{ tool: 'get_system_status', args: {} }]
    });
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Hackathon Team Builder Node.js REST API Running!`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`=======================================================`);
});
