import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Scenario } from '../model/types'
import { SCHEMA_VERSION } from '../model/types'
import { blankScenario, cloneScenario } from '../model/defaults'
import { exampleModel } from '../model/fixtures/exampleModel'

const STORAGE_KEY = 'pw:scenarios'

/**
 * localStorage can throw — Safari private mode, blocked site data, a browser
 * with storage disabled. None of that should take the app down, so every access
 * is guarded and failure degrades to in-memory state for the session.
 */
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {
      /* quota exceeded or storage blocked — keep running in memory */
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

interface ScenarioState {
  scenarios: Scenario[]
  activeId: string | null
  lastExportedAt: number | null

  active: () => Scenario | undefined
  setActive: (id: string) => void
  create: (name?: string) => string
  duplicate: (id: string) => string | null
  loadExample: () => string
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  update: (id: string, patch: (s: Scenario) => Scenario) => void

  exportJson: () => string
  importJson: (json: string, mode: 'merge' | 'replace') => { ok: boolean; message: string }
  markExported: () => void
}

export const useScenarios = create<ScenarioState>()(
  persist(
    (set, get) => ({
      scenarios: [],
      activeId: null,
      lastExportedAt: null,

      active: () => get().scenarios.find((s) => s.id === get().activeId),

      setActive: (id) => set({ activeId: id }),

      create: (name = 'New scenario') => {
        const s = blankScenario(name)
        set((st) => ({ scenarios: [...st.scenarios, s], activeId: s.id }))
        return s.id
      },

      duplicate: (id) => {
        const src = get().scenarios.find((s) => s.id === id)
        if (!src) return null
        const copy = cloneScenario(src, `${src.name} (copy)`)
        set((st) => ({ scenarios: [...st.scenarios, copy], activeId: copy.id }))
        return copy.id
      },

      loadExample: () => {
        const copy = cloneScenario(exampleModel, exampleModel.name)
        set((st) => ({ scenarios: [...st.scenarios, copy], activeId: copy.id }))
        return copy.id
      },

      rename: (id, name) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) =>
            s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
          ),
        })),

      remove: (id) =>
        set((st) => {
          const scenarios = st.scenarios.filter((s) => s.id !== id)
          const activeId =
            st.activeId === id ? (scenarios.length > 0 ? scenarios[0]!.id : null) : st.activeId
          return { scenarios, activeId }
        }),

      update: (id, patch) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) =>
            s.id === id ? { ...patch(s), updatedAt: Date.now() } : s,
          ),
        })),

      exportJson: () =>
        JSON.stringify(
          {
            kind: 'poject-w-backup',
            schemaVersion: SCHEMA_VERSION,
            exportedAt: Date.now(),
            scenarios: get().scenarios,
          },
          null,
          2,
        ),

      importJson: (json, mode) => {
        try {
          const parsed = JSON.parse(json) as {
            kind?: string
            scenarios?: Scenario[]
          }
          if (parsed.kind !== 'poject-w-backup' || !Array.isArray(parsed.scenarios)) {
            return { ok: false, message: 'Not a Project W backup file.' }
          }
          const incoming = parsed.scenarios
          if (incoming.length === 0) {
            return { ok: false, message: 'That backup contains no scenarios.' }
          }
          if (mode === 'replace') {
            set({ scenarios: incoming, activeId: incoming[0]!.id })
            return { ok: true, message: `Replaced everything with ${incoming.length} scenario(s).` }
          }
          const existing = get().scenarios
          const existingIds = new Set(existing.map((s) => s.id))
          const merged = [
            ...existing,
            ...incoming.map((s) =>
              existingIds.has(s.id) ? cloneScenario(s, `${s.name} (imported)`) : s,
            ),
          ]
          set({ scenarios: merged, activeId: merged[merged.length - 1]!.id })
          return { ok: true, message: `Added ${incoming.length} scenario(s).` }
        } catch {
          return { ok: false, message: 'Could not read that file — is it valid JSON?' }
        }
      },

      markExported: () => set({ lastExportedAt: Date.now() }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted, from) => {
        // No migrations yet. When the schema changes, transform here rather
        // than letting an old shape reach the engine.
        if (from === SCHEMA_VERSION) return persisted as ScenarioState
        return persisted as ScenarioState
      },
      partialize: (st) => ({
        scenarios: st.scenarios,
        activeId: st.activeId,
        lastExportedAt: st.lastExportedAt,
      }) as ScenarioState,
    },
  ),
)
