/**
 * Meeting Analyzer Service
 * Provides utilities for analyzing meeting transcripts
 */

import { Injectable } from '@nitrostack/core';
import type { MeetingSummary, ActionItem } from '../schemas/meeting.schema.js';

@Injectable()
export class MeetingAnalyzerService {
  /**
   * Summarize a meeting transcript
   */
  summarizeMeeting(transcript: string): MeetingSummary {
    const attendeePattern = /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?):\s/gm;
    const attendees = new Set<string>();
    let match;
    while ((match = attendeePattern.exec(transcript)) !== null) {
      attendees.add(match[1]);
    }

    const keywordPatterns = [
      /(?:important|key|critical|must|should|need to).*?[.!?]/gi,
      /(?:decided|decided to|will|going to).*?[.!?]/gi
    ];
    const keyPoints: string[] = [];
    keywordPatterns.forEach(pattern => {
      let keyMatch;
      while ((keyMatch = pattern.exec(transcript)) !== null) {
        const point = keyMatch[0].trim();
        if (point.length > 10 && !keyPoints.includes(point)) {
          keyPoints.push(point);
        }
      }
    });

    const decisionPattern = /(?:decided|decision|agreed|will do|commit to).*?[.!?]/gi;
    const decisions: string[] = [];
    let decisionMatch;
    while ((decisionMatch = decisionPattern.exec(transcript)) !== null) {
      const decision = decisionMatch[0].trim();
      if (decision.length > 10 && !decisions.includes(decision)) {
        decisions.push(decision);
      }
    }

    const nextStepPattern = /(?:next|follow.?up|schedule|plan to|will).*?[.!?]/gi;
    const nextSteps: string[] = [];
    let stepMatch;
    while ((stepMatch = nextStepPattern.exec(transcript)) !== null) {
      const step = stepMatch[0].trim();
      if (step.length > 10 && !nextSteps.includes(step)) {
        nextSteps.push(step);
      }
    }

    const firstSentence = transcript.split(/[.!?]/)[0];
    const title = firstSentence.length > 50
      ? firstSentence.substring(0, 50) + '...'
      : firstSentence || 'Meeting Summary';

    const estimatedMinutes = Math.ceil(transcript.length / 100);
    const duration = `${Math.min(estimatedMinutes, 120)} minutes`;

    return {
      title,
      attendees: Array.from(attendees),
      duration,
      keyPoints: keyPoints.slice(0, 5),
      decisions: decisions.slice(0, 5),
      nextSteps: nextSteps.slice(0, 5)
    };
  }

  /**
   * Extract action items from a meeting transcript.
   * Parses transcript into speaker turns first, then reads each turn
   * sentence-by-sentence so tasks, owners, and corrections
   * ("assign it to Bob", "priority to high") attach to the right item.
   */
  extractActionItems(transcript: string): ActionItem[] {
    const turns = this.parseTurns(transcript);
    const actionItems: ActionItem[] = [];
    let lastItem: ActionItem | null = null;

    for (const turn of turns) {
      const sentences = turn.text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

      for (const sentence of sentences) {
        // Corrections applied to the most recent item — check all three,
        // since one sentence can carry multiple corrections at once
        // (e.g. "I'll assign it to Bob and set the priority to high.")
        let handledAsCorrection = false;

        const priorityMatch = sentence.match(/priority to (low|medium|high|critical)/i);
        if (priorityMatch && lastItem) {
          lastItem.priority = priorityMatch[1].toLowerCase() as ActionItem['priority'];
          handledAsCorrection = true;
        }

        const assignMatch = sentence.match(/assign(?:ed)?\s+it\s+to\s+([A-Z][a-zA-Z]*)/i);
        if (assignMatch && lastItem) {
          lastItem.owner = assignMatch[1];
          handledAsCorrection = true;
        }

        const deadlineUpdateMatch = sentence.match(/deadline (?:should be|is)\s+(.+)/i);
        if (deadlineUpdateMatch && lastItem) {
          lastItem.deadline = this.parseDeadline(deadlineUpdateMatch[1]);
          handledAsCorrection = true;
        }

        if (handledAsCorrection) continue;

        // "I'll start by X" continuation — update last item's deadline, don't create a new task
        const startByMatch = sentence.match(/^i(?:'ll| will)\s+start\s+by\s+(.+)/i);
        if (startByMatch && lastItem && lastItem.owner === turn.speaker) {
          lastItem.deadline = this.parseDeadline(startByMatch[1]);
          continue;
        }

        // "I'll / I will / I can / I'm going to <task> [by <deadline>]"
        const selfTaskMatch = sentence.match(/^i(?:'ll| will| can| am going to| plan to)\s+(.+)/i);
        if (selfTaskMatch) {
          const { task, deadlineStr } = this.splitTaskAndDeadline(selfTaskMatch[1]);
          const item: ActionItem = {
            task: this.cleanTask(task),
            owner: turn.speaker,
            deadline: deadlineStr ? this.parseDeadline(deadlineStr) : this.defaultDeadline(),
            priority: this.determinePriority(selfTaskMatch[1])
          };
          actionItems.push(item);
          lastItem = item;
          continue;
        }

        // "Name, can you <task>?" — request directed at someone by name
        const requestMatch = sentence.match(/^([A-Z][a-zA-Z]*),?\s*(?:can you|could you|please)\s+(.+)/i);
        if (requestMatch) {
          const { task, deadlineStr } = this.splitTaskAndDeadline(requestMatch[2]);
          const item: ActionItem = {
            task: this.cleanTask(task),
            owner: requestMatch[1],
            deadline: deadlineStr ? this.parseDeadline(deadlineStr) : this.defaultDeadline(),
            priority: this.determinePriority(requestMatch[2])
          };
          actionItems.push(item);
          lastItem = item;
          continue;
        }

        // "schedule a follow-up meeting for mid-February"
        const scheduleMatch = sentence.match(/schedule (?:a )?follow-?up meeting (?:for|on)\s+(.+)/i);
        if (scheduleMatch) {
          const item: ActionItem = {
            task: `Schedule follow-up meeting for ${scheduleMatch[1].replace(/[.?!]+$/, '').trim()}`,
            owner: turn.speaker,
            deadline: this.parseDeadline(scheduleMatch[1]),
            priority: 'medium'
          };
          actionItems.push(item);
          lastItem = item;
          continue;
        }
      }
    }

    return actionItems;
  }

  /** Splits "finish backend by Wednesday" into { task: "finish backend", deadlineStr: "Wednesday" } */
  private splitTaskAndDeadline(text: string): { task: string; deadlineStr: string | null } {
    const byMatch = text.match(/^(.*?)\s+by\s+(.+)$/i);
    if (byMatch) {
      return { task: byMatch[1], deadlineStr: byMatch[2] };
    }
    return { task: text, deadlineStr: null };
  }

  private cleanTask(task: string): string {
    return task.replace(/[.?!]+$/, '').trim();
  }

  private defaultDeadline(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }

  /** Splits transcript into { speaker, text } turns using "Name:" markers */
  private parseTurns(transcript: string): { speaker: string; text: string }[] {
    const parts = transcript.split(/([A-Z][a-zA-Z]*):\s*/);
    const turns: { speaker: string; text: string }[] = [];
    for (let i = 1; i < parts.length - 1; i += 2) {
      const speaker = parts[i].trim();
      const text = parts[i + 1].trim();
      if (speaker && text) turns.push({ speaker, text });
    }
    return turns;
  }

  /**
   * Parse deadline string to ISO format
   */
  private parseDeadline(deadlineStr: string): string {
    const now = new Date();
    const lowerStr = deadlineStr.toLowerCase().replace(/[.?!]+$/, '').trim();

    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    if (lowerStr.includes('today')) {
      return now.toISOString();
    }
    if (lowerStr.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString();
    }
    if (lowerStr.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString();
    }

    // "next Monday", "by Wednesday", etc.
    const weekdayMatch = weekdays.find(day => lowerStr.includes(day));
    if (weekdayMatch) {
      const targetDay = weekdays.indexOf(weekdayMatch);
      const result = new Date(now);
      let diff = (targetDay - result.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // always push to the *next* occurrence
      result.setDate(result.getDate() + diff);
      return result.toISOString();
    }

    // "mid-February" / "mid February"
    const midMatch = months.find(month => lowerStr.includes('mid') && lowerStr.includes(month));
    if (midMatch) {
      const monthIndex = months.indexOf(midMatch);
      const year = now.getFullYear();
      return new Date(year, monthIndex, 15).toISOString();
    }

    // "end of February"
    if (lowerStr.includes('end of')) {
      const monthMatch = months.find(month => lowerStr.includes(month));
      if (monthMatch) {
        const monthIndex = months.indexOf(monthMatch);
        const year = now.getFullYear();
        const lastDay = new Date(year, monthIndex + 1, 0);
        return lastDay.toISOString();
      }
    }

    // Bare month name, e.g. "February" — default to the 1st
    const bareMonth = months.find(month => lowerStr.includes(month));
    if (bareMonth) {
      const monthIndex = months.indexOf(bareMonth);
      const year = now.getFullYear();
      return new Date(year, monthIndex, 1).toISOString();
    }

    // Try to parse as a literal date string
    const parsed = new Date(deadlineStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    // Fallback
    const defaultDeadline = new Date(now);
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    return defaultDeadline.toISOString();
  }

  /**
   * Determine priority based on task keywords
   */
  private determinePriority(task: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerTask = task.toLowerCase();

    if (lowerTask.match(/(?:critical|urgent|asap|immediately|blocking)/)) {
      return 'critical';
    }
    if (lowerTask.match(/(?:high|important|priority|must|essential)/)) {
      return 'high';
    }
    if (lowerTask.match(/(?:low|minor|optional|nice.?to.?have)/)) {
      return 'low';
    }

    return 'medium';
  }
}