/**
 * Mock task data and in-memory task store
 */

export interface Task {
  id: string;
  title: string;
  owner: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  meetingId?: string;
}

export const mockTasks: Task[] = [
  {
    id: 'task_001',
    title: 'Mobile app redesign',
    owner: 'Bob Smith',
    deadline: '2025-02-28T23:59:59Z',
    priority: 'high',
    status: 'in_progress',
    createdAt: '2025-01-15T10:30:00Z',
    meetingId: 'mtg_001'
  },
  {
    id: 'task_002',
    title: 'Implement dark mode support',
    owner: 'David Lee',
    deadline: '2025-02-28T23:59:59Z',
    priority: 'high',
    status: 'pending',
    createdAt: '2025-01-15T10:30:00Z',
    meetingId: 'mtg_001'
  },
  {
    id: 'task_003',
    title: 'Complete API authentication module',
    owner: 'Emma Wilson',
    deadline: '2025-01-16T17:00:00Z',
    priority: 'high',
    status: 'in_progress',
    createdAt: '2025-01-14T09:45:00Z',
    meetingId: 'mtg_002'
  },
  {
    id: 'task_004',
    title: 'Share API spec with Frank',
    owner: 'Emma Wilson',
    deadline: '2025-01-14T17:00:00Z',
    priority: 'medium',
    status: 'completed',
    createdAt: '2025-01-14T09:45:00Z',
    meetingId: 'mtg_002'
  },
  {
    id: 'task_005',
    title: 'Complete database schema',
    owner: 'Frank Brown',
    deadline: '2025-01-17T17:00:00Z',
    priority: 'high',
    status: 'pending',
    createdAt: '2025-01-14T09:45:00Z',
    meetingId: 'mtg_002'
  }
];

// In-memory task store (simulates a database)
export class TaskStore {
  private tasks: Map<string, Task> = new Map();
  private nextId: number = 6;

  constructor(initialTasks: Task[] = mockTasks) {
    initialTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const id = `task_${String(this.nextId).padStart(3, '0')}`;
    this.nextId++;
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date().toISOString()
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  getTasksByOwner(owner: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.owner === owner);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  getTasksByMeeting(meetingId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.meetingId === meetingId);
  }

  getPendingTasks(): Task[] {
    return this.getTasksByStatus('pending');
  }

  getCompletedTasks(): Task[] {
    return this.getTasksByStatus('completed');
  }

  getUpcomingDeadlines(days: number = 7): Task[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.tasks.values())
      .filter(t => {
        const deadline = new Date(t.deadline);
        return deadline >= now && deadline <= futureDate && t.status !== 'completed';
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }
}

// Global task store instance
export const taskStore = new TaskStore();
