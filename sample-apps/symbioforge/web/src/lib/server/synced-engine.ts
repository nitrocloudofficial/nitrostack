import "server-only"

import { engine } from "@/lib/engine"
import type { Factory } from "@/lib/types"
import {
  isDatabaseConfigured,
  loadFactoriesFromDatabase,
  persistFactoryToDatabase,
} from "@/lib/server/factory-repository"

let lastSyncAt = 0
const SYNC_TTL_MS = 10_000

export async function getSyncedEngine() {
  if (!isDatabaseConfigured()) return engine

  const now = Date.now()
  if (now - lastSyncAt < SYNC_TTL_MS) return engine

  try {
    const factories = await loadFactoriesFromDatabase()
    if (factories && factories.length > 0) {
      engine.replaceFactories(factories)
      const state = engine.getState()
      if (state.matches.length === 0 && factories.length >= 5) {
        engine.resetState()
      }
    }
  } catch {
    // DB unavailable — use seed data
  }
  lastSyncAt = now

  return engine
}

export async function persistFactory(factory: Factory): Promise<void> {
  await persistFactoryToDatabase(factory)
  lastSyncAt = 0
}
