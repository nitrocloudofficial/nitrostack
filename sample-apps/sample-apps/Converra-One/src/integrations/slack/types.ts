export interface SlackMessageRaw {
  ts: string;
  user?: string;
  text: string;
  channel: string;
  thread_ts?: string;
}
