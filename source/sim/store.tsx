import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore as useZustand } from "zustand";
import { SimulationEngine } from "./engine";
import type { AgentId, SectionId, Settings, Snapshot } from "./types";

export interface SimUI {
  section: SectionId;
  selected: AgentId | null;
  taskAgent: AgentId | "all";
  confirmReset: boolean;
  notice: string | null;
}

export interface SimState {
  snap: Snapshot;
  settings: Settings;
  ui: SimUI;
  startAll: () => void;
  stopAll: () => void;
  reset: () => void;
  startAgent: (id: AgentId) => void;
  stopAgent: (id: AgentId) => void;
  pauseAgent: (id: AgentId) => void;
  resumeAgent: (id: AgentId) => void;
  approve: (id: string, yes: boolean) => void;
  setCapital: (amount: number) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setSection: (section: SectionId) => void;
  selectAgent: (id: AgentId | null) => void;
  viewTasks: (id: AgentId | "all") => void;
  requestReset: (open: boolean) => void;
  exportJson: () => string;
  importJson: (raw: string) => void;
  clearNotice: () => void;
}

function sync(engine: SimulationEngine, store: StoreApi<SimState>) {
  store.setState({ snap: engine.snapshot(), settings: engine.getSettings() });
}

export function createSimStore() {
  const engine = new SimulationEngine();
  const store = createStore<SimState>((set) => ({
    snap: engine.snapshot(),
    settings: engine.getSettings(),
    ui: { section: "command", selected: null, taskAgent: "all", confirmReset: false, notice: null },
    startAll: () => engine.startAll(),
    stopAll: () => engine.stopAll(),
    reset: () => {
      engine.reset();
      set((s) => ({ ui: { ...s.ui, confirmReset: false } }));
    },
    startAgent: (id) => engine.startAgent(id),
    stopAgent: (id) => engine.stopAgent(id),
    pauseAgent: (id) => engine.pauseAgent(id),
    resumeAgent: (id) => engine.resumeAgent(id),
    approve: (id, yes) => engine.approve(id, yes),
    setCapital: (amount) => engine.setCapital(amount),
    updateSettings: (partial) => engine.updateSettings(partial),
    setSection: (section) => set((s) => ({ ui: { ...s.ui, section } })),
    selectAgent: (id) => set((s) => ({ ui: { ...s.ui, selected: id } })),
    viewTasks: (id) => set((s) => ({ ui: { ...s.ui, section: "tasks", taskAgent: id, selected: s.ui.selected } })),
    requestReset: (open) => set((s) => ({ ui: { ...s.ui, confirmReset: open } })),
    exportJson: () => engine.exportJson(),
    importJson: (raw) => {
      const result = engine.importJson(raw);
      if (!result.ok) set((s) => ({ ui: { ...s.ui, notice: result.error } }));
      else set((s) => ({ ui: { ...s.ui, notice: "Configuration importée." } }));
    },
    clearNotice: () => set((s) => ({ ui: { ...s.ui, notice: null } })),
  }));
  engine.subscribe(() => sync(engine, store));
  return { store, engine };
}

const Ctx = createContext<StoreApi<SimState> | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const [{ store, engine }] = useState(createSimStore);
  useEffect(() => {
    engine.hydrate();
    return () => engine.dispose();
  }, [engine]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useSim<T>(selector: (state: SimState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error("SimProvider manquant");
  return useZustand(store, selector);
}

export function useSimStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("SimProvider manquant");
  return store;
}
