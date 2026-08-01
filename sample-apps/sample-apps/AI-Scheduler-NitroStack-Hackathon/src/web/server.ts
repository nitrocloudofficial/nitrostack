import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AssistantTools } from '../modules/assistant/assistant.tools.js';
import { GoogleCalendarService } from '../modules/assistant/google-calendar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assistantTools = new AssistantTools();

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

interface UserRecord {
  name: string;
  email: string;
  password: string;
  isGoogle?: boolean;
  tokens?: any;
}

const USERS_FILE = path.resolve(process.cwd(), 'data/users.json');
const registeredUsers = new Map<string, UserRecord>();

function isGmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith('@gmail.com') || lower.endsWith('@googlemail.com');
}

function loadUsers() {
  try {
    if (existsSync(USERS_FILE)) {
      const data = readFileSync(USERS_FILE, 'utf8');
      const list: UserRecord[] = JSON.parse(data || '[]');
      for (const u of list) {
        if (u.email) {
          registeredUsers.set(u.email.toLowerCase().trim(), u);
        }
      }
    }
  } catch (e) {
    console.error('Failed to load users from file:', e);
  }
  // Ensure default demo Gmail user exists
  const demoEmail = 'demo.assistant.user@gmail.com';
  if (!registeredUsers.has(demoEmail)) {
    registeredUsers.set(demoEmail, {
      name: 'Demo Assistant User',
      email: demoEmail,
      password: 'password123',
      isGoogle: false
    });
    saveUsers();
  }
}

function saveUsers() {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const list = Array.from(registeredUsers.values());
    writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save users to file:', e);
  }
}

interface UserDataStore {
  tasks: any[];
  habits: any[];
  expenses: any[];
}

const USER_DATA_FILE = path.resolve(process.cwd(), 'data/user_data.json');
const userDataStoreMap = new Map<string, UserDataStore>();

function loadUserData() {
  try {
    if (existsSync(USER_DATA_FILE)) {
      const raw = readFileSync(USER_DATA_FILE, 'utf8');
      const obj = JSON.parse(raw || '{}');
      for (const email of Object.keys(obj)) {
        userDataStoreMap.set(email.toLowerCase().trim(), obj[email]);
      }
    }
  } catch (err) {
    console.error('Failed to load user data store:', err);
  }
}

function saveUserData() {
  try {
    const dir = path.dirname(USER_DATA_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, UserDataStore> = {};
    for (const [email, store] of userDataStoreMap.entries()) {
      obj[email] = store;
    }
    writeFileSync(USER_DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save user data store:', err);
  }
}

function getUserData(email: string): UserDataStore {
  const key = email.toLowerCase().trim();
  if (!userDataStoreMap.has(key)) {
    const defaultData: UserDataStore = {
      tasks: [],
      habits: [
        { id: 'h1', name: 'Meditation', frequency: 'daily', streakCount: 5, lastCompleted: '2026-07-25' },
        { id: 'h2', name: 'Reading', frequency: 'daily', streakCount: 3, lastCompleted: '2026-07-25' },
        { id: 'h3', name: 'Workout', frequency: 'daily', streakCount: 2, lastCompleted: '2026-07-24' }
      ],
      expenses: [
        { id: 'e1', amount: 14.50, category: 'food', description: 'Lunch salad & coffee', date: '2026-07-25' },
        { id: 'e2', amount: 22.00, category: 'transport', description: 'Train fare', date: '2026-07-25' }
      ]
    };
    userDataStoreMap.set(key, defaultData);
    saveUserData();
  }
  return userDataStoreMap.get(key)!;
}

// Initial loads
loadUsers();
loadUserData();

// In-memory session store: sessionId -> user
const sessions = new Map<string, { name: string; email: string; isGoogle?: boolean; tokens?: any }>();
function generateSessionId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function createSessionAndSetCookie(res: ServerResponse, user: { name: string; email: string; isGoogle?: boolean; tokens?: any }): string {
  const sid = generateSessionId();
  sessions.set(sid, { name: user.name, email: user.email, isGoogle: !!user.isGoogle, tokens: user.tokens });
  // 30 days persistent cookie so user stays logged in across browser restarts until explicit logout
  res.setHeader('Set-Cookie', `sid=${sid}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
  return sid;
}


const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? '/';
  const urlPath = url.split('?')[0];

  if (req.method === 'GET' && url === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'ai-assistant' });
    return;
  }

  // --- Real Google OAuth: redirect to Google consent screen ---
  if (req.method === 'GET' && urlPath === '/auth/google') {
    const googleCalendar = new GoogleCalendarService();
    const authUrl = googleCalendar.getAuthorizationUrl();
    if (authUrl) {
      res.writeHead(302, { 'Location': authUrl });
    } else {
      res.writeHead(302, { 'Location': '/?google_unconfigured=1' });
    }
    res.end();
    return;
  }

  // --- Real Google OAuth callback ---
  if (req.method === 'GET' && urlPath === '/auth/callback') {
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const code = params.get('code');
    if (!code) {
      res.writeHead(302, { 'Location': '/?auth_error=no_code' });
      res.end();
      return;
    }
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/auth/callback';
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const profileRes = await oauth2.userinfo.get();
      const profileEmail = (profileRes.data.email ?? '').toLowerCase().trim();
      const profileName = profileRes.data.name ?? profileEmail.split('@')[0];

      if (!profileEmail || !isGmailAddress(profileEmail)) {
        res.writeHead(302, { 'Location': '/?auth_error=not_gmail' });
        res.end();
        return;
      }

      let userRec = registeredUsers.get(profileEmail);
      if (!userRec) {
        userRec = { name: profileName, email: profileEmail, password: '', isGoogle: true, tokens };
        registeredUsers.set(profileEmail, userRec);
      } else {
        userRec.tokens = tokens;
      }
      saveUsers();

      const sid = createSessionAndSetCookie(res, userRec);

      res.writeHead(302, {
        'Location': `/?session=${sid}`
      });
      res.end();
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.writeHead(302, { 'Location': '/?auth_error=callback_failed' });
      res.end();
    }
    return;
  }

  // --- Session check: frontend calls this on startup to restore login state ---
  if (req.method === 'GET' && urlPath === '/api/auth/me') {
    const cookieHeader = req.headers['cookie'] ?? '';
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;
    const user = sid ? sessions.get(sid) : null;
    if (user) {
      const data = getUserData(user.email);
      sendJson(res, 200, { status: 'ok', user, data });
    } else {
      sendJson(res, 401, { status: 'unauthenticated' });
    }
    return;
  }

  // --- Logout endpoint ---
  if (req.method === 'POST' && urlPath === '/api/auth/logout') {
    const cookieHeader = req.headers['cookie'] ?? '';
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    if (sidMatch) {
      sessions.delete(sidMatch[1]);
    }
    res.setHeader('Set-Cookie', 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
    sendJson(res, 200, { status: 'success', message: 'Logged out successfully' });
    return;
  }

  if (req.method === 'POST' && url === '/api/auth/register') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { name, email, password } = JSON.parse(body || '{}');
        if (!email || !password) {
          sendJson(res, 400, { error: 'Email and password are required.' });
          return;
        }
        const lowerEmail = email.toLowerCase().trim();
        if (!isGmailAddress(lowerEmail)) {
          sendJson(res, 400, { error: 'Authentication requires a valid @gmail.com email address.' });
          return;
        }
        if (registeredUsers.has(lowerEmail)) {
          sendJson(res, 400, { error: 'This Gmail address is already registered. Please Sign In.', redirect: 'login' });
          return;
        }
        const newUser: UserRecord = { name: name || lowerEmail.split('@')[0], email: lowerEmail, password };
        registeredUsers.set(lowerEmail, newUser);
        saveUsers();

        const data = getUserData(lowerEmail);
        createSessionAndSetCookie(res, newUser);
        sendJson(res, 200, { status: 'success', user: { name: newUser.name, email: newUser.email }, data, message: 'Registered successfully!' });
      } catch (err) {
        sendJson(res, 500, { error: 'Invalid registration payload' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/auth/login') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body || '{}');
        if (!email || !password) {
          sendJson(res, 400, { error: 'Email and password are required.' });
          return;
        }
        const lowerEmail = email.toLowerCase().trim();
        if (!isGmailAddress(lowerEmail)) {
          sendJson(res, 400, { error: 'Authentication requires a valid @gmail.com email address.' });
          return;
        }
        const existing = registeredUsers.get(lowerEmail);
        if (!existing) {
          sendJson(res, 404, { error: 'Gmail user not registered. Please register first!', redirect: 'register' });
          return;
        }
        if (existing.password !== password && !existing.isGoogle) {
          sendJson(res, 401, { error: 'Incorrect password.' });
          return;
        }

        const data = getUserData(lowerEmail);
        createSessionAndSetCookie(res, existing);
        sendJson(res, 200, { status: 'success', user: { name: existing.name, email: existing.email }, data, message: 'Logged in successfully!' });
      } catch (err) {
        sendJson(res, 500, { error: 'Invalid login payload' });
      }
    });
    return;
  }



  if (req.method === 'POST' && url === '/api/assistant/sync-calendar') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { tasks, userId } = JSON.parse(body || '{}');
        const taskList = Array.isArray(tasks) ? tasks : [];

        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userRecord = sessionUser ? registeredUsers.get(sessionUser.email) : (userId ? registeredUsers.get(userId.toLowerCase().trim()) : null);
        const userTokens = sessionUser?.tokens || userRecord?.tokens;

        const results = [];
        let authUrl: string | null = null;
        let syncedSuccessCount = 0;

        for (const t of taskList) {
          try {
            const resItem = await assistantTools.createCalendarEvent({
              title: t.title || 'Scheduled Task',
              startTime: t.startTime,
              endTime: t.endTime,
              userId: userId || sessionUser?.email || 'demo-user',
              userTokens
            }, { logger: console } as any);
            if (resItem.authUrl) authUrl = resItem.authUrl;
            if (resItem.status === 'success') syncedSuccessCount++;
            results.push(resItem);
          } catch (itemErr: any) {
            results.push({
              status: 'error',
              title: t.title,
              message: itemErr.message || 'Could not sync task'
            });
          }
        }

        sendJson(res, 200, {
          status: 'success',
          syncedCount: syncedSuccessCount,
          totalCount: results.length,
          results,
          authUrl,
          needsAuth: !userTokens && !process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to sync tasks to Google Calendar' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/assistant/parse') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || payload.userId || 'demo.assistant.user@gmail.com';

        const result = await assistantTools.extractTimeblockKeywords({ text: payload.text ?? '', userId: userEmail }, { logger: console } as any);

        const store = getUserData(userEmail);

        // Handle deletion intent if present
        let promptRemovedTasks: any[] = [];
        if (result.deletionIntent) {
          const today = new Date();
          if (result.deletionIntent.type === 'all') {
            promptRemovedTasks = [...store.tasks];
            store.tasks = [];
          } else if (result.deletionIntent.type === 'today') {
            promptRemovedTasks = store.tasks.filter(t => {
              if (!t.startTime) return false;
              const d = new Date(t.startTime);
              return d.getFullYear() === today.getFullYear() &&
                     d.getMonth() === today.getMonth() &&
                     d.getDate() === today.getDate();
            });
            store.tasks = store.tasks.filter(t => !promptRemovedTasks.includes(t));
          } else if (result.deletionIntent.type === 'specific' && result.deletionIntent.targetTitle) {
            const targetLower = result.deletionIntent.targetTitle.toLowerCase();
            promptRemovedTasks = store.tasks.filter(t => t.title.toLowerCase().includes(targetLower));
            store.tasks = store.tasks.filter(t => !t.title.toLowerCase().includes(targetLower));
          }

          const userRecDel = registeredUsers.get(userEmail.toLowerCase());
          const userTokensDel = userRecDel?.tokens;
          if (userTokensDel && userTokensDel.access_token && promptRemovedTasks.length > 0) {
            const googleCalendarDel = new GoogleCalendarService();
            // Non-blocking background deletion sync
            (async () => {
              for (const t of promptRemovedTasks) {
                if ((t as any).googleCalendarEventId) {
                  try {
                    await googleCalendarDel.deleteEvent((t as any).googleCalendarEventId, userTokensDel);
                  } catch (_) {}
                }
              }
            })();
          }
        }

        // Update existing tasks or append newly extracted tasks to store
        if (result.extractedTasks && result.extractedTasks.length > 0) {
          for (const newT of result.extractedTasks) {
            const newTitleClean = (newT.title || '').toLowerCase().trim();
            const existingIdx = store.tasks.findIndex(t => (t.title || '').toLowerCase().trim() === newTitleClean);
            if (existingIdx !== -1) {
              store.tasks[existingIdx] = {
                ...store.tasks[existingIdx],
                ...newT,
                id: store.tasks[existingIdx].id // preserve ID
              };
            } else {
              store.tasks.push(newT);
            }
          }
        }

        // Update expenses
        if (result.extractedExpenses && result.extractedExpenses.length > 0) {
          store.expenses = [...result.extractedExpenses, ...store.expenses];
        }

        // Update habits
        if (result.extractedHabits && result.extractedHabits.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          for (const h of result.extractedHabits) {
            const existingHabit = store.habits.find(item => item.name.toLowerCase() === h.name.toLowerCase());
            if (existingHabit) {
              if (existingHabit.lastCompleted !== todayStr) {
                existingHabit.streakCount = (existingHabit.streakCount || 0) + 1;
                existingHabit.lastCompleted = todayStr;
              }
            } else {
              store.habits.push({
                id: 'h_' + Date.now() + Math.random().toString(36).slice(2, 5),
                name: h.name,
                frequency: 'daily',
                streakCount: 1,
                lastCompleted: todayStr,
                history: { [todayStr]: true }
              });
            }
          }
        }

        // AUTO CONFLICT RESOLUTION: Stagger conflicting time blocks first
        const rescheduleRes = await assistantTools.rescheduleConflicts({ tasks: store.tasks, userId: userEmail }, { logger: console } as any);
        store.tasks = rescheduleRes.suggestions as any[];
        const conflictsAutoResolved = rescheduleRes.rescheduledCount;

        // Save local state immediately so response is instantaneous
        saveUserData();

        // GOOGLE CALENDAR AUTO-SYNC: Non-blocking background sync
        const userRec = registeredUsers.get(userEmail.toLowerCase());
        const userTokens = userRec?.tokens;
        if (userTokens && userTokens.access_token) {
          const googleCalendar = new GoogleCalendarService();
          (async () => {
            for (const task of store.tasks) {
              if (task.startTime && task.endTime) {
                try {
                  if ((task as any).googleCalendarEventId) {
                    await googleCalendar.updateEvent((task as any).googleCalendarEventId, {
                      title: task.title,
                      startTime: task.startTime,
                      endTime: task.endTime,
                      description: task.description || `Created by AI Scheduler`
                    }, userTokens);
                  } else {
                    const calResult = await googleCalendar.createEvent({
                      title: task.title,
                      startTime: task.startTime,
                      endTime: task.endTime,
                      description: task.description || `Created by AI Scheduler`
                    }, userTokens);
                    if (calResult.id) {
                      (task as any).googleCalendarEventId = calResult.id;
                      saveUserData();
                    }
                  }
                } catch (_) {}
              }
            }
          })();
        }

        // Check if user explicitly asked for a summary in their prompt
        const promptText = (payload.text || '').toLowerCase();
        const userRequestedSummary = /summary|report|overview|headline|insights/i.test(promptText);

        sendJson(res, 200, {
          status: 'success',
          summary: userRequestedSummary ? result.summary : null,
          userRequestedSummary,
          conflictsAutoResolved,
          extractedTasks: result.extractedTasks,
          extractedExpenses: result.extractedExpenses,
          extractedHabits: result.extractedHabits,
          allTasks: store.tasks,
          allExpenses: store.expenses,
          allHabits: store.habits
        });
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/assistant/reschedule') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || payload.userId || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const result = await assistantTools.rescheduleConflicts({ tasks: store.tasks, userId: userEmail }, { logger: console } as any);
        store.tasks = result.suggestions as any[];
        saveUserData();

        sendJson(res, 200, {
          status: 'success',
          summary: result.summary,
          rescheduledCount: result.rescheduledCount,
          tasks: store.tasks
        });
      } catch (error: any) {
        sendJson(res, 500, { error: error.message || 'Failed to reschedule tasks' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/tasks/delete') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { taskId, index, mode } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const today = new Date();
        const userRec = registeredUsers.get(userEmail.toLowerCase());
        const userTokens = userRec?.tokens;
        const googleCalendar = new GoogleCalendarService();

        let removedTasks: any[] = [];

        if (mode === 'all') {
          removedTasks = [...store.tasks];
          store.tasks = [];
        } else if (mode === 'today') {
          removedTasks = store.tasks.filter(t => {
            if (!t.startTime) return false;
            const d = new Date(t.startTime);
            return d.getFullYear() === today.getFullYear() &&
                   d.getMonth() === today.getMonth() &&
                   d.getDate() === today.getDate();
          });
          store.tasks = store.tasks.filter(t => !removedTasks.includes(t));
        } else if (typeof index === 'number' && index >= 0 && index < store.tasks.length) {
          removedTasks = store.tasks.splice(index, 1);
        } else if (taskId) {
          removedTasks = store.tasks.filter(t => t.id === taskId);
          store.tasks = store.tasks.filter(t => t.id !== taskId);
        }

        saveUserData();

        // Delete events from Google Calendar in background
        if (userTokens && userTokens.access_token && removedTasks.length > 0) {
          (async () => {
            for (const t of removedTasks) {
              if ((t as any).googleCalendarEventId) {
                try {
                  await googleCalendar.deleteEvent((t as any).googleCalendarEventId, userTokens);
                } catch (_) {}
              }
            }
          })();
        }

        sendJson(res, 200, { status: 'success', tasks: store.tasks });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to delete task(s)' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/habits/create') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { name, frequency } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        if (!name || !name.trim()) {
          sendJson(res, 400, { error: 'Habit name is required' });
          return;
        }

        const store = getUserData(userEmail);
        const newHabit = {
          id: 'h_' + Date.now() + Math.random().toString(36).slice(2, 5),
          name: name.trim(),
          frequency: frequency || 'daily',
          streakCount: 0,
          lastCompleted: '',
          history: {}
        };
        store.habits.push(newHabit);
        saveUserData();

        sendJson(res, 200, { status: 'success', habits: store.habits });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to create habit' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/habits/update') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { habitId, name, frequency } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const habit = store.habits.find(h => h.id === habitId);
        if (habit) {
          if (name) habit.name = name.trim();
          if (frequency) habit.frequency = frequency;
          saveUserData();
        }

        sendJson(res, 200, { status: 'success', habits: store.habits });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to update habit' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/habits/delete') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { habitId } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        store.habits = store.habits.filter(h => h.id !== habitId);
        saveUserData();

        sendJson(res, 200, { status: 'success', habits: store.habits });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to delete habit' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/habits/toggle') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { habitId, name, date } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const targetDate = date || new Date().toISOString().split('T')[0];

        let habit = store.habits.find(h => h.id === habitId || (name && h.name.toLowerCase() === name.toLowerCase()));
        if (!habit && name) {
          habit = { id: 'h_' + Date.now(), name, frequency: 'daily', streakCount: 0, lastCompleted: '', history: {} };
          store.habits.push(habit);
        }

        if (habit) {
          if (!habit.history) habit.history = {};
          const currentVal = !!habit.history[targetDate];
          habit.history[targetDate] = !currentVal;

          // Re-calculate streak and lastCompleted
          const dates = Object.keys(habit.history).filter(d => habit.history[d]).sort();
          habit.streakCount = dates.length;
          habit.lastCompleted = dates.length > 0 ? dates[dates.length - 1] : '';
        }

        saveUserData();

        sendJson(res, 200, { status: 'success', habits: store.habits });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to toggle habit' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/expenses/create') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { amount, category, description, date } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const newExpense = {
          id: 'e_' + Date.now() + Math.random().toString(36).slice(2, 5),
          amount: parseFloat(amount) || 0,
          category: category || 'general',
          description: description || 'Expense',
          date: date || new Date().toISOString().split('T')[0]
        };
        store.expenses.unshift(newExpense);
        saveUserData();

        sendJson(res, 200, { status: 'success', expenses: store.expenses });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to create expense' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/expenses/update') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { expenseId, amount, category, description, date } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        const exp = store.expenses.find(e => e.id === expenseId);
        if (exp) {
          if (amount !== undefined) exp.amount = parseFloat(amount) || 0;
          if (category) exp.category = category;
          if (description) exp.description = description;
          if (date) exp.date = date;
          saveUserData();
        }

        sendJson(res, 200, { status: 'success', expenses: store.expenses });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to update expense' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/expenses/delete') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { expenseId, index } = JSON.parse(body || '{}');
        const cookieHeader = req.headers['cookie'] ?? '';
        const sidMatch = cookieHeader.match(/sid=([^;]+)/);
        const sid = sidMatch ? sidMatch[1] : null;
        const sessionUser = sid ? sessions.get(sid) : null;
        const userEmail = sessionUser?.email || 'demo.assistant.user@gmail.com';

        const store = getUserData(userEmail);
        if (typeof index === 'number' && index >= 0 && index < store.expenses.length) {
          store.expenses.splice(index, 1);
        } else if (expenseId) {
          store.expenses = store.expenses.filter(e => e.id !== expenseId);
        }

        saveUserData();

        sendJson(res, 200, { status: 'success', expenses: store.expenses });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Failed to delete expense' });
      }
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/assistant/create-calendar-event') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await assistantTools.createCalendarEvent({
          title: payload.title,
          startTime: payload.startTime,
          endTime: payload.endTime,
          userId: payload.userId
        }, { logger: console } as any);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
    return;
  }

  if (url === '/api/assistant/summary') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      let tasks: any[] = [];
      try {
        if (body) {
          const parsed = JSON.parse(body);
          tasks = parsed.tasks || [];
        }
      } catch {
        tasks = [];
      }

      const today = new Date();
      function isToday(dateString?: string) {
        if (!dateString) return false;
        const d = new Date(dateString);
        return d.getFullYear() === today.getFullYear() &&
               d.getMonth() === today.getMonth() &&
               d.getDate() === today.getDate();
      }

      const todayTasks = tasks.filter(t => isToday(t.startTime));

      if (todayTasks.length === 0) {
        sendJson(res, 200, {
          status: 'success',
          headline: '🎙️ Daily Reporter Briefing',
          summaryText: 'Good day! Reporting live from your personal assistant dashboard. As of right now, no tasks have been logged specifically for today. Your schedule remains open for strategic planning or focus work.',
          insights: [
            '💡 Reporter Insight: Leverage your free schedule today to tackle high-priority initiatives.',
            '📌 Tip: Add or parse tasks above to generate a full reporter breakdown.'
          ]
        });
        return;
      }

      let totalHours = 0;
      const taskSummaries: string[] = [];

      todayTasks.forEach(t => {
        let durationStr = '';
        if (t.startTime && t.endTime) {
          const start = new Date(t.startTime);
          const end = new Date(t.endTime);
          const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (diffHours > 0) {
            totalHours += diffHours;
            durationStr = ` (${diffHours.toFixed(1)} hrs)`;
          }
        }
        const timeFormatted = t.startTime ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'unscheduled time';
        taskSummaries.push(`  • "${t.title}" starting at ${timeFormatted}${durationStr}`);
      });

      const formattedHours = totalHours.toFixed(1);
      const taskCount = todayTasks.length;

      const summaryText = `🎙️ DAILY EXECUTIVE BRIEFING\n` +
        `----------------------------------------\n` +
        `Good day! Here is your official reporter breakdown for today. You have ${taskCount} scheduled focus item(s) logged, accounting for approximately ${formattedHours} hour(s) of planned productivity.\n\n` +
        `TODAY'S HEADLINE AGENDA:\n` +
        taskSummaries.join('\n') + `\n\n` +
        `REPORTER ANALYSIS:\n` +
        `Your day shows ${taskCount} active commitments totaling ${formattedHours} hours. ${totalHours > 4 ? 'You have a high-density workload today—be sure to incorporate rest intervals!' : 'Your schedule is well-proportioned for steady execution.'}`;

      const insights = [
        `📊 Daily Total: ${taskCount} task(s) logged | ${formattedHours} hours scheduled.`,
        totalHours > 4 ? '⚠️ High Load Alert: Over 4 hours scheduled today. Protect your focus windows!' : '✅ Balanced Workload: Great pacing for today.'
      ];

      sendJson(res, 200, {
        status: 'success',
        headline: '🎙️ Daily Reporter Briefing',
        summaryText,
        insights
      });
    });
    return;
  }

  try {
    const candidatePaths = [
      path.join(__dirname, 'index.html'),
      path.resolve(process.cwd(), 'src/web/index.html'),
      path.resolve(process.cwd(), 'dist/web/index.html'),
      path.resolve(__dirname, '../../src/web/index.html')
    ];

    let html = '';
    for (const p of candidatePaths) {
      try {
        html = await readFile(p, 'utf8');
        if (html) break;
      } catch {
        // try next path
      }
    }

    if (!html) {
      sendJson(res, 404, { error: 'index.html file not found' });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown server error' });
  }
});

let port = Number(process.env.PORT || 3000);

function startServer(p: number) {
  const s = server.listen(p);
  s.once('listening', () => {
    console.log(`Assistant web app listening on http://localhost:${p}`);
  });
  s.once('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${p} is in use, trying next available port...`);
      s.close();
      startServer(p + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(port);
