export interface HabitDocument {
  userId: string;
  name: string;
  frequency: string;
  streakCount: number;
  history: Array<{ date: string; completed: boolean }>;
}

export class HabitModel {
  static create(habit: Partial<HabitDocument>): HabitDocument {
    return {
      userId: habit.userId ?? 'demo-user',
      name: habit.name ?? 'New habit',
      frequency: habit.frequency ?? 'daily',
      streakCount: habit.streakCount ?? 0,
      history: habit.history ?? []
    } as HabitDocument;
  }
}
