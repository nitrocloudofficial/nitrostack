export interface DailySummaryDocument {
  userId: string;
  date: string;
  metrics: {
    tasksCompleted: number;
    totalHoursLogged: number;
    expensesTotal: number;
  };
  summaryText: string;
  insights: string[];
}

export class DailySummaryModel {
  static create(summary: Partial<DailySummaryDocument>): DailySummaryDocument {
    return {
      userId: summary.userId ?? 'demo-user',
      date: summary.date ?? new Date().toISOString(),
      metrics: summary.metrics ?? {
        tasksCompleted: 0,
        totalHoursLogged: 0,
        expensesTotal: 0
      },
      summaryText: summary.summaryText ?? 'No summary available yet.',
      insights: summary.insights ?? []
    } as DailySummaryDocument;
  }
}
