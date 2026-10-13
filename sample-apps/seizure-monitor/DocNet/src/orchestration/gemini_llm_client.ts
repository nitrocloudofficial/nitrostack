/**
 * Gemini LLM Client with Session Rehydration & JSONB Pruning
 *
 * Manages short-term session memory via Supabase JSONB chat history.
 * Implements pruning to keep message history under 10 turns (system prompt + last 10 messages)
 * to prevent unbounded growth and hitting the 500MB free tier cap.
 *
 * Architecture:
 * 1. On user request: Query Supabase sessions table by session_id
 * 2. Rehydrate: Load message_history JSONB into Gemini context
 * 3. Prune: If array > 10 turns, drop middle messages (keep system + last 10)
 * 4. Append new user message + LLM response
 * 5. UPDATE Supabase with pruned history
 */

import { generateText, streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface SessionRecord {
  session_id: string;
  patient_id: string;
  message_history: SessionMessage[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// GEMINI CLIENT INITIALIZATION
// ============================================================================

const geminiModel = google('gemini-1.5-pro');

// ============================================================================
// PRUNING LOGIC
// ============================================================================

/**
 * Prunes message history to prevent unbounded JSONB growth.
 *
 * Strategy:
 * - Always keep the system prompt (first message with role='system')
 * - Keep the most recent 10 messages (user + assistant turns)
 * - Drop middle messages if total exceeds 11 (system + 10 recent)
 *
 * @param messages - Full message history
 * @returns Pruned message history
 */
function pruneMessageHistory(messages: SessionMessage[]): SessionMessage[] {
  if (messages.length <= 11) {
    return messages; // No pruning needed
  }

  // Find system prompt (always first)
  const systemPrompt = messages.find((m) => m.role === 'system');
  if (!systemPrompt) {
    // No system prompt; keep last 10 messages
    return messages.slice(-10);
  }

  // Keep system prompt + last 10 messages
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  const recentMessages = nonSystemMessages.slice(-10);

  return [systemPrompt, ...recentMessages];
}

// ============================================================================
// SESSION REHYDRATION
// ============================================================================

/**
 * Loads session message history from Supabase.
 *
 * @param sessionId - Authenticated session ID
 * @returns Message history or empty array if session not found
 */
async function loadSessionHistory(sessionId: string): Promise<SessionMessage[]> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('message_history')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      console.error(`[ERROR] Failed to load session ${sessionId}:`, error.message);
      return [];
    }

    if (!data || !data.message_history) {
      return [];
    }

    // Validate message history structure
    if (!Array.isArray(data.message_history)) {
      console.warn(`[WARN] message_history is not an array for session ${sessionId}`);
      return [];
    }

    return data.message_history as SessionMessage[];
  } catch (err) {
    console.error('[ERROR] Unexpected error loading session history:', err);
    return [];
  }
}

/**
 * Saves pruned session message history to Supabase.
 *
 * @param sessionId - Authenticated session ID
 * @param patientId - Patient ID (from ExecutionContext)
 * @param messages - Pruned message history
 */
async function saveSessionHistory(
  sessionId: string,
  patientId: string,
  messages: SessionMessage[],
): Promise<void> {
  try {
    const prunedMessages = pruneMessageHistory(messages);

    const { error } = await supabase
      .from('sessions')
      .upsert(
        {
          session_id: sessionId,
          patient_id: patientId,
          message_history: prunedMessages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      );

    if (error) {
      console.error(`[ERROR] Failed to save session ${sessionId}:`, error.message);
    }
  } catch (err) {
    console.error('[ERROR] Unexpected error saving session history:', err);
  }
}

// ============================================================================
// GEMINI ORCHESTRATION
// ============================================================================

/**
 * Generates a response using Gemini with session context rehydration.
 *
 * Flow:
 * 1. Load existing message history from Supabase
 * 2. Append new user message
 * 3. Call Gemini with full context
 * 4. Append assistant response
 * 5. Prune and save back to Supabase
 *
 * @param sessionId - Authenticated session ID
 * @param patientId - Patient ID (from ExecutionContext)
 * @param userMessage - New user message
 * @param systemPrompt - System prompt for medical triage
 * @returns Gemini response text
 */
export async function generateTriageResponse(
  sessionId: string,
  patientId: string,
  userMessage: string,
  systemPrompt: string = 'You are a medical triage assistant. Help patients describe their symptoms and route them to appropriate care.',
): Promise<string> {
  try {
    // Step 1: Load existing session history
    let messages = await loadSessionHistory(sessionId);

    // Step 2: Ensure system prompt is present
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Append new user message
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Call Gemini with rehydrated context
    const response = await generateText({
      model: geminiModel,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      temperature: 0.7,
    });

    const assistantMessage = response.text;

    // Step 5: Append assistant response
    messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Prune and save back to Supabase
    await saveSessionHistory(sessionId, patientId, messages);

    return assistantMessage;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Failed to generate triage response:', errorMsg);
    throw new Error(`Triage response generation failed: ${errorMsg}`);
  }
}

/**
 * Streams a response using Gemini with session context rehydration.
 *
 * Similar to generateTriageResponse but returns a stream for real-time UI updates.
 *
 * @param sessionId - Authenticated session ID
 * @param patientId - Patient ID (from ExecutionContext)
 * @param userMessage - New user message
 * @param systemPrompt - System prompt for medical triage
 * @returns Async iterable of streamed text chunks
 */
export async function* streamTriageResponse(
  sessionId: string,
  patientId: string,
  userMessage: string,
  systemPrompt: string = 'You are a medical triage assistant. Help patients describe their symptoms and route them to appropriate care.',
): AsyncGenerator<string, void, unknown> {
  try {
    // Step 1: Load existing session history
    let messages = await loadSessionHistory(sessionId);

    // Step 2: Ensure system prompt is present
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Append new user message
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Stream response from Gemini
    const stream = await streamText({
      model: geminiModel,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      temperature: 0.7,
    });

    let fullResponse = '';

    // Yield streamed chunks
    for await (const chunk of stream.textStream) {
      fullResponse += chunk;
      yield chunk;
    }

    // Step 5: Append full assistant response
    messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Prune and save back to Supabase
    await saveSessionHistory(sessionId, patientId, messages);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Failed to stream triage response:', errorMsg);
    throw new Error(`Triage response streaming failed: ${errorMsg}`);
  }
}

/**
 * Initializes a new session with a system prompt.
 *
 * @param sessionId - Authenticated session ID
 * @param patientId - Patient ID (from ExecutionContext)
 * @param systemPrompt - System prompt for medical triage
 */
export async function initializeSession(
  sessionId: string,
  patientId: string,
  systemPrompt: string = 'You are a medical triage assistant. Help patients describe their symptoms and route them to appropriate care.',
): Promise<void> {
  try {
    const initialMessages: SessionMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
        timestamp: new Date().toISOString(),
      },
    ];

    await saveSessionHistory(sessionId, patientId, initialMessages);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Failed to initialize session:', errorMsg);
    throw new Error(`Session initialization failed: ${errorMsg}`);
  }
}

/**
 * Clears session history (for testing or explicit user request).
 *
 * @param sessionId - Authenticated session ID
 */
export async function clearSessionHistory(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ message_history: [] })
      .eq('session_id', sessionId);

    if (error) {
      console.error(`[ERROR] Failed to clear session ${sessionId}:`, error.message);
    }
  } catch (err) {
    console.error('[ERROR] Unexpected error clearing session history:', err);
  }
}

/**
 * Gets current session statistics (for monitoring JSONB size).
 *
 * @param sessionId - Authenticated session ID
 * @returns Message count and estimated size
 */
export async function getSessionStats(
  sessionId: string,
): Promise<{ messageCount: number; estimatedSizeKB: number }> {
  try {
    const messages = await loadSessionHistory(sessionId);
    const jsonString = JSON.stringify(messages);
    const estimatedSizeKB = new TextEncoder().encode(jsonString).length / 1024;

    return {
      messageCount: messages.length,
      estimatedSizeKB,
    };
  } catch (error) {
    console.error('[ERROR] Failed to get session stats:', error);
    return { messageCount: 0, estimatedSizeKB: 0 };
  }
}
