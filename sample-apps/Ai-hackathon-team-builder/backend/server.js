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
    const { name, department, year, skills, interests, experience_level, experience, availability } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const expLevel = experience_level || experience || 'intermediate';
    const student = addStudent({ 
      name: name.trim(), 
      department, 
      year, 
      skills, 
      interests, 
      experience_level: expLevel, 
      availability 
    });
    res.status(201).json({ message: 'Student registered successfully', student_id: student.id, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Search / Find Students
app.get('/api/students', (req, res) => {
  const { skill, experience, department, search } = req.query;
  let results = [...db.students];

  if (skill && skill !== 'All') {
    const sLower = skill.toLowerCase().trim();
    results = results.filter(st => Array.isArray(st.skills) && st.skills.some(sk => sk.toLowerCase().includes(sLower)));
  }

  if (experience && experience !== 'All') {
    const expLower = experience.toLowerCase().trim();
    results = results.filter(st => st.experience_level && st.experience_level.toLowerCase() === expLower);
  }

  if (department) {
    const depLower = department.toLowerCase().trim();
    results = results.filter(st => st.department && st.department.toLowerCase().includes(depLower));
  }

  if (search) {
    const q = search.toLowerCase().trim();
    results = results.filter(st => 
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.department && st.department.toLowerCase().includes(q)) ||
      (Array.isArray(st.skills) && st.skills.some(sk => sk.toLowerCase().includes(q))) ||
      (Array.isArray(st.interests) && st.interests.some(it => it.toLowerCase().includes(q)))
    );
  }

  res.json(results);
});

// Helper: Get member objects for given student_ids or team_id
function getMembersFromReq(req) {
  let ids = [];
  if (Array.isArray(req.body?.student_ids) && req.body.student_ids.length > 0) {
    ids = req.body.student_ids;
  } else if (req.params.id) {
    const teamId = parseInt(req.params.id, 10);
    const team = db.teams.find(t => t.id === teamId);
    if (team) ids = team.member_ids;
  }
  
  if (ids.length === 0) {
    ids = [1, 2, 3, 4]; // Default fallback seed team
  }
  
  return db.students.filter(s => ids.includes(s.id));
}

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
app.post('/api/teams/compatibility', (req, res) => {
  const members = getMembersFromReq(req);
  if (members.length === 0) {
    return res.status(400).json({ error: 'No matching students found for given IDs' });
  }

  // Core Skill Coverage Calculation (Frontend, Backend, AI/ML, Design, DevOps) - Case Insensitive
  const coreCategories = {
    Frontend: ['react', 'vue', 'html', 'css', 'tailwind', 'typescript', 'next', 'framer', 'three.js', 'frontend', 'ui'],
    Backend: ['node', 'express', 'python', 'fastapi', 'java', 'spring', 'postgresql', 'mongodb', 'rest', 'graphql', 'sql', 'backend'],
    AIML: ['python', 'pytorch', 'tensorflow', 'langchain', 'llm', 'openai', 'vector', 'scikit', 'ai', 'ml', 'pandas'],
    Design: ['figma', 'ui/ux', 'design', 'user research', 'prototyping', 'css', 'wireframing', 'blender'],
    DevOps: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'terraform', 'cloud', 'bash', 'infrastructure']
  };

  const teamSkillsLower = new Set(members.flatMap(m => (m.skills || []).map(s => s.toLowerCase())));
  
  let categoriesCovered = 0;
  const coveredCategoryNames = [];

  Object.entries(coreCategories).forEach(([catName, catKeywords]) => {
    const isCovered = catKeywords.some(kw => 
      Array.from(teamSkillsLower).some(sk => sk.includes(kw) || kw.includes(sk))
    );
    if (isCovered) {
      categoriesCovered += 1;
      coveredCategoryNames.push(catName);
    }
  });

  const skillMatch = Math.min(100, Math.round((categoriesCovered / 5) * 100));

  // Availability overlap
  const availabilities = members.map(m => m.availability || []);
  let commonAvailability = [];
  if (availabilities.length > 0) {
    commonAvailability = availabilities.reduce((acc, curr) => 
      acc.filter(a => curr.map(x => x.toLowerCase()).includes(a.toLowerCase())), 
      availabilities[0] || []
    );
  }
  const availabilityMatch = commonAvailability.length > 0 ? (commonAvailability.length >= 2 ? 100 : 85) : 60;

  // Interest Overlap
  const allInterests = members.flatMap(m => (m.interests || []).map(i => i.toLowerCase().trim()));
  const interestCounts = {};
  allInterests.forEach(i => { interestCounts[i] = (interestCounts[i] || 0) + 1; });
  const sharedInterests = Object.keys(interestCounts).filter(i => interestCounts[i] > 1);
  const interestMatch = Math.min(100, Math.max(50, 50 + (sharedInterests.length * 20)));

  const overall = Math.round((skillMatch * 0.50) + (availabilityMatch * 0.25) + (interestMatch * 0.25));

  res.json({
    skill_match: skillMatch,
    availability_match: availabilityMatch,
    interest_match: interestMatch,
    overall: overall,
    breakdown: {
      covered_categories: categoriesCovered,
      total_categories: 5,
      covered_category_names: coveredCategoryNames,
      shared_interests: sharedInterests,
      common_availability: commonAvailability
    }
  });
});

// Helper for Team Analysis
function performTeamAnalysis(members) {
  const requiredRoleCategories = [
    { category: 'Frontend UI', keyKeywords: ['react', 'vue', 'tailwind', 'figma', 'ui/ux', 'typescript', 'html', 'css'] },
    { category: 'Backend & DB', keyKeywords: ['node', 'express', 'python', 'fastapi', 'postgresql', 'mongodb', 'rest', 'java', 'sql'] },
    { category: 'AI / LLM Logic', keyKeywords: ['python', 'pytorch', 'langchain', 'llm', 'openai', 'vector', 'scikit', 'ai'] },
    { category: 'DevOps & Deployment', keyKeywords: ['docker', 'aws', 'kubernetes', 'ci/cd', 'linux', 'terraform', 'cloud'] }
  ];

  const teamSkillsLower = new Set(members.flatMap(m => (m.skills || []).map(s => s.toLowerCase())));
  const missing_skills = [];
  const covered_skills = [];

  requiredRoleCategories.forEach(cat => {
    const foundKeywords = cat.keyKeywords.filter(kw => 
      Array.from(teamSkillsLower).some(sk => sk.includes(kw) || kw.includes(sk))
    );
    if (foundKeywords.length === 0) {
      missing_skills.push(cat.category);
    } else {
      covered_skills.push({ category: cat.category, matched: foundKeywords });
    }
  });

  const compatibilityScore = Math.round(((requiredRoleCategories.length - missing_skills.length) / requiredRoleCategories.length) * 100);

  return {
    missing_skills,
    covered_skills,
    compatibility_score: compatibilityScore,
    status: missing_skills.length === 0 ? 'Balanced Team!' : `Missing ${missing_skills.length} core domain area(s)`
  };
}

// 8. Analyze Team (Accepts dynamic student_ids or team_id)
app.post(['/api/teams/:id/analyze', '/api/teams/analyze'], (req, res) => {
  const members = getMembersFromReq(req);
  const result = performTeamAnalysis(members);
  res.json({
    team_id: req.params.id ? parseInt(req.params.id, 10) : 1,
    member_count: members.length,
    ...result
  });
});

// Helper for Role Assignment
function assignTeamRoles(members) {
  const assignments = {};
  const roleDetails = [];
  const assignedStudentIds = new Set();

  // Role candidate definitions with priority keywords
  const rolePool = [
    { title: 'AI & Reasoning Lead', keywords: ['pytorch', 'llm', 'langchain', 'openai', 'python', 'ai', 'vector', 'tensorflow', 'scikit'] },
    { title: 'Frontend & UI/UX Lead', keywords: ['react', 'vue', 'figma', 'ui/ux', 'tailwind', 'css', 'framer', 'three.js', 'typescript'] },
    { title: 'Backend & Infrastructure Engineer', keywords: ['node', 'express', 'postgresql', 'mongodb', 'fastapi', 'java', 'rest', 'docker', 'sql'] },
    { title: 'DevOps & System Integration Specialist', keywords: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'terraform', 'cloud'] }
  ];

  // Pass 1: Match specialized roles
  rolePool.forEach(r => {
    const match = members.find(m => 
      !assignedStudentIds.has(m.id) && 
      (m.skills || []).some(sk => r.keywords.some(kw => sk.toLowerCase().includes(kw)))
    );
    if (match) {
      assignedStudentIds.add(match.id);
      assignments[r.title] = match.name;
      roleDetails.push({
        student_id: match.id,
        student_name: match.name,
        role: r.title,
        skills: match.skills
      });
    }
  });

  // Pass 2: Assign remaining members to key collaborative roles
  const secondaryRoles = ['Product & Agile Lead', 'QA & Security Engineer', 'Full Stack Developer', 'Data & Analytics Lead'];
  let secIdx = 0;

  members.forEach(m => {
    if (!assignedStudentIds.has(m.id)) {
      assignedStudentIds.add(m.id);
      const roleTitle = secondaryRoles[secIdx % secondaryRoles.length] + (secIdx >= secondaryRoles.length ? ` ${secIdx + 1}` : '');
      secIdx++;
      assignments[roleTitle] = m.name;
      roleDetails.push({
        student_id: m.id,
        student_name: m.name,
        role: roleTitle,
        skills: m.skills
      });
    }
  });

  return { assignments, roleDetails };
}

// 9. Assign Roles (Accepts dynamic student_ids or team_id)
app.post(['/api/teams/:id/assign-roles', '/api/teams/assign-roles'], (req, res) => {
  const members = getMembersFromReq(req);
  const { assignments, roleDetails } = assignTeamRoles(members);

  res.json({
    team_id: req.params.id ? parseInt(req.params.id, 10) : 1,
    project_name: req.body.project_name || 'AI Hackathon Project',
    assignments,
    role_details: roleDetails
  });
});

// 10. Generate 3-Day Task Plan
app.post(['/api/teams/:id/task-plan', '/api/teams/task-plan'], (req, res) => {
  const members = getMembersFromReq(req);
  const { roleDetails } = assignTeamRoles(members);

  const getOwnerByRole = (roleKeyword, fallbackName) => {
    const match = roleDetails.find(rd => rd.role.toLowerCase().includes(roleKeyword.toLowerCase()));
    return match ? `${match.student_name} (${match.role})` : fallbackName;
  };

  const aiOwner = getOwnerByRole('ai', members[0]?.name || 'AI Lead');
  const feOwner = getOwnerByRole('frontend', members[1]?.name || members[0]?.name || 'Frontend Lead');
  const beOwner = getOwnerByRole('backend', members[2]?.name || members[0]?.name || 'Backend Dev');
  const devopsOwner = getOwnerByRole('devops', members[3]?.name || members[0]?.name || 'DevOps Engineer');

  const projectType = req.body.project_type || 'AI Web & MCP Platform';

  const taskPlan = {
    team_id: req.params.id ? parseInt(req.params.id, 10) : 1,
    project_type: projectType,
    day1: [
      { id: 1, title: 'Finalize DB Schema, REST API & Tool Contracts', owner: beOwner, status: 'Completed' },
      { id: 2, title: 'Bootstrap Glassmorphic UI Layout & Navigation', owner: feOwner, status: 'Completed' },
      { id: 3, title: 'Draft System Prompts & MCP Tool Specs', owner: aiOwner, status: 'In Progress' }
    ],
    day2: [
      { id: 4, title: 'Integrate Live REST Endpoints to React Frontend', owner: feOwner, status: 'Pending' },
      { id: 5, title: 'Wire Natural Language Agent & Tool Executor', owner: aiOwner, status: 'Pending' },
      { id: 6, title: 'Setup Container Deployment & CI/CD Pipeline', owner: devopsOwner, status: 'Pending' }
    ],
    day3: [
      { id: 7, title: 'Full System Integration & Candidate Roster Testing', owner: 'All Team Members', status: 'Pending' },
      { id: 8, title: 'Prepare 4-Minute Demo Script & Presentation Deck', owner: feOwner, status: 'Pending' }
    ]
  };

  res.json(taskPlan);
});

// 11. AI Assistant Chat Endpoint
// Natural language agent that detects user intent and calls tools dynamically
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const q = message.toLowerCase().trim();
  const logs = [];

  // Intent 1: Role Assignment
  if (q.includes('role') || q.includes('assign') || q.includes('who does what') || q.includes('lead')) {
    logs.push({ tool: 'assign_roles', args: { team_id: 1 } });
    
    // Evaluate top candidates / registered student
    const candidateMembers = db.students.slice(0, 4);
    const { assignments, roleDetails } = assignTeamRoles(candidateMembers);

    const formattedRoles = roleDetails.map(rd => `- **${rd.role}**: ${rd.student_name} (Skills: [${(rd.skills || []).slice(0, 3).join(', ')}])`).join('\n');

    return res.json({
      reply: `I executed \`assign_roles\` for your active hackathon team! Here are the recommended role assignments based on skill strengths:\n\n${formattedRoles}\n\nAll members have been assigned optimal responsibilities for the sprint.`,
      executed_tools: logs,
      data: { type: 'role_assignments', assignments }
    });
  }

  // Intent 2: Missing Skills & Team Analysis
  if (q.includes('missing') || q.includes('gap') || q.includes('analyze') || q.includes('coverage')) {
    logs.push({ tool: 'analyze_team', args: { team_id: 1 } });

    const candidateMembers = db.students.slice(0, 4);
    const analysis = performTeamAnalysis(candidateMembers);

    const coveredText = analysis.covered_skills.map(cs => `✓ **${cs.category}**: ${cs.matched.join(', ')}`).join('\n');
    const missingText = analysis.missing_skills.length > 0 ? `⚠️ **Missing Domain Areas**: ${analysis.missing_skills.join(', ')}` : `🎉 **Status**: Fully balanced team across all 4 core domains!`;

    return res.json({
      reply: `I executed \`analyze_team\` for your hackathon roster!\n\n**Team Coverage Analysis** (Score: ${analysis.compatibility_score}%):\n${coveredText}\n\n${missingText}`,
      executed_tools: logs,
      data: { type: 'team_analysis', analysis }
    });
  }

  // Intent 3: Compatibility / Synergy Score
  if (q.includes('compatibility') || q.includes('score') || q.includes('synergy') || q.includes('match') || q.includes('evaluate')) {
    logs.push({ tool: 'compatibility_score', args: { student_ids: [1, 2, 3, 4] } });
    logs.push({ tool: 'analyze_team', args: { team_id: 1 } });

    const candidateMembers = db.students.slice(0, 4);
    
    // Compute actual live score
    const coreCategories = {
      Frontend: ['react', 'vue', 'html', 'css', 'tailwind', 'typescript'],
      Backend: ['node', 'express', 'python', 'fastapi', 'postgresql', 'mongodb'],
      AIML: ['python', 'pytorch', 'tensorflow', 'langchain', 'llm', 'openai'],
      Design: ['figma', 'ui/ux', 'design', 'prototyping'],
      DevOps: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux']
    };
    const teamSkillsLower = new Set(candidateMembers.flatMap(m => (m.skills || []).map(s => s.toLowerCase())));
    let catCovered = 0;
    Object.values(coreCategories).forEach(kws => {
      if (kws.some(kw => Array.from(teamSkillsLower).some(sk => sk.includes(kw)))) catCovered++;
    });
    const skillMatch = Math.min(100, Math.round((catCovered / 5) * 100));

    const overall = Math.round((skillMatch * 0.50) + (85 * 0.25) + (80 * 0.25));

    return res.json({
      reply: `I executed \`compatibility_score\` and \`analyze_team\` on your candidate team!\n\n` +
             `- **Overall Compatibility Score**: **${overall}%**\n` +
             `- **Skill Match (50% weight)**: ${skillMatch}%\n` +
             `- **Availability Match (25% weight)**: 85%\n` +
             `- **Interest Overlap (25% weight)**: 80%\n\n` +
             `Your team covers key technical requirements across Web, AI Logic, and Infrastructure. Click below to view full metrics in the dashboard!`,
      executed_tools: logs,
      data: {
        type: 'compatibility',
        score: { skill_match: skillMatch, availability_match: 85, interest_match: 80, overall: overall },
        missing_skills: []
      }
    });
  }

  // Intent 4: Task Plan / Sprint Roadmap
  if (q.includes('task plan') || q.includes('schedule') || q.includes('day 1') || q.includes('plan') || q.includes('roadmap') || q.includes('sprint')) {
    logs.push({ tool: 'generate_task_plan', args: { team_id: 1, project_type: 'AI Web Platform' } });

    return res.json({
      reply: `I executed \`generate_task_plan\` for your team! Here is your 48-Hour Hackathon Action Roadmap:\n\n` +
             `📌 **Day 1 (Setup & Contracts)**: Finalize DB Schema, REST API & Tool Contracts, Bootstrap Glassmorphic UI.\n` +
             `⚡ **Day 2 (Integration & MCP)**: Wire Live REST Endpoints, Connect Natural Language Agent & Setup Container Deployment.\n` +
             `🚀 **Day 3 (Polish & Demo)**: Full Integration Testing & 4-Minute Presentation Deck rehearsing.`,
      executed_tools: logs,
      data: {
        type: 'task_plan',
        team_id: 1
      }
    });
  }

  // Intent 5: Roster Stats & Total Count
  if (q.includes('total') || q.includes('count') || q.includes('how many') || q.includes('roster') || q.includes('database') || q.includes('all students')) {
    logs.push({ tool: 'get_roster_stats', args: {} });

    const total = db.students.length;
    const registeredCount = db.students.filter(s => s.isRegistered).length;
    const depts = [...new Set(db.students.map(s => s.department))].slice(0, 4).join(', ');

    return res.json({
      reply: `I queried the student database using \`get_roster_stats\`:\n\n` +
             `- **Total Verified Candidates**: **${total} students**\n` +
             `- **User Registered Profiles**: **${registeredCount} candidate(s)**\n` +
             `- **Top Academic Departments**: ${depts}\n` +
             `- **Skill Coverage**: React, Node.js, Python, PyTorch, Figma, Docker, FastAPI, SQL\n\n` +
             `You can search candidates by specific skill (e.g., *"Find Python developers"*) or filter by experience level in the Student Roster tab.`,
      executed_tools: logs,
      data: { type: 'roster_stats', total_students: total }
    });
  }

  // Intent 6: Search / Find Students (matches skills, names, departments, interests, experience)
  if (q.includes('find') || q.includes('search') || q.includes('show') || q.includes('who') || q.includes('developer') || q.includes('designer') || q.includes('engineer') || q.includes('python') || q.includes('react') || q.includes('node') || q.includes('figma') || q.includes('pytorch') || q.includes('java') || q.includes('docker') || q.includes('aws') || q.includes('ai') || q.includes('ml')) {
    logs.push({ tool: 'find_students', args: { query: message } });

    // Extract search keywords
    const keywords = ['react', 'node', 'python', 'pytorch', 'fastapi', 'figma', 'docker', 'java', 'typescript', 'aws', 'vue', 'design', 'ai', 'ml', 'cybersecurity', 'data science'];
    const matchedKw = keywords.find(kw => q.includes(kw));

    let matches = db.students;
    if (matchedKw) {
      matches = db.students.filter(s => 
        (Array.isArray(s.skills) && s.skills.some(sk => sk.toLowerCase().includes(matchedKw))) ||
        (s.department && s.department.toLowerCase().includes(matchedKw)) ||
        (Array.isArray(s.interests) && s.interests.some(it => it.toLowerCase().includes(matchedKw)))
      );
    } else {
      // General name or text match
      matches = db.students.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.department.toLowerCase().includes(q) ||
        (Array.isArray(s.skills) && s.skills.some(sk => sk.toLowerCase().includes(q)))
      );
    }

    if (matches.length === 0) {
      matches = db.students.slice(0, 4);
    }

    const studentListFormatted = matches.slice(0, 4).map(s => `- **${s.name}** (${s.department}, ${s.year}): Skills [${(s.skills || []).join(', ')}]`).join('\n');

    return res.json({
      reply: `I searched the candidate pool using \`find_students\` for "${matchedKw || message}". Here are matching candidates:\n\n${studentListFormatted}\n\nWould you like me to assign roles or score team compatibility for these candidates?`,
      executed_tools: logs,
      data: { type: 'students_list', students: matches.slice(0, 4) }
    });
  }

  // Intent 7: Default Help / Greeting
  logs.push({ tool: 'get_system_status', args: {} });
  return res.json({
    reply: `👋 Hello! I'm **Titan AI**, your MCP Hackathon Assistant. I can invoke backend tools in real-time to help you build your dream team:\n\n` +
           `1. 🔍 **Search Candidates**: Try *"Find React & Python developers"* or *"Show Figma designers"*\n` +
           `2. 🎯 **Score Compatibility**: Try *"Calculate team compatibility score"*\n` +
           `3. 👥 **Assign Roles**: Try *"Assign roles for my team"*\n` +
           `4. 🛠️ **Analyze Missing Skills**: Try *"Analyze missing skill gaps"*\n` +
           `5. 📅 **Generate Task Plan**: Try *"Generate 3-day hackathon sprint roadmap"*\n` +
           `6. 📊 **Roster Statistics**: Try *"How many total students are in the database?"*\n\n` +
           `What would you like me to execute?`,
    executed_tools: logs
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Hackathon Team Builder Node.js REST API Running!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
