import { AsyncLocalStorage } from 'node:async_hooks';
import type { CapturedState, CompensatorSpec } from '../types.js';

/**
 * Bridges tool input across the @nitrostack/core execution pipeline for
 * JournalInterceptor + JournalCapturePipe.
 *
 * Neither guards, middleware, nor interceptors receive a tool's input in this
 * SDK — only the Pipe stage does (Guards -> Middleware -> Interceptors ->
 * Pipes -> Handler), and interceptors only see the eventual output via next().
 * JournalInterceptor stashes per-call state here before calling next(); the
 * paired JournalCapturePipe (which runs strictly before the handler) fills in
 * `input` and performs the pre-read; JournalInterceptor reads both back once
 * next() resolves.
 */
export interface JournalCallState {
  spec: CompensatorSpec | null;
  input: unknown;
  captured: CapturedState;
  preReadWarning: string | null;
}

export const journalCallStorage = new AsyncLocalStorage<JournalCallState>();
