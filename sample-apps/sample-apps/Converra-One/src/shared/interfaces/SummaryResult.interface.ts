export interface SummaryResult {
  targetId: string; // Message or Conversation ID
  summaryType: 'bullet_points' | 'executive' | 'action_items';
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
  generatedAt: Date;
}
