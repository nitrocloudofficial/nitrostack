export interface Commit {
  id: string;
  project: string;
  file: string;
  authorId: string;
  author: string;
  date: string;
  message: string;
  meetingId: string;
  documentId: string;
}