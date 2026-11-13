import { activeBrain } from "./backend.ts";
import { ANGLES, CATALOG, HOOKS, PLATFORMS } from "./catalog.ts";
import { sound, type SoundKind } from "./sound.ts";
import {
  AGENT_META,
  clamp,
  defaultSettings,
  money,
  WORKERS,
  type AgentId,
  type AgentMessage,
  type AgentView,
  type Approval,
  type Campaign,
  type Creative,
  type Expression,
  type HistPoint,
  type LogEntry,
  type Mission,
  type Product,
  type Pulse,
  type Settings,
  type Snapshot,
  type WorkStatus,
} from "./types.ts";

const STORAGE_KEY = "aecc.command.v1";
const PASS_SCORE = 48;

interface AgentState {
  enabled: boolean;
  paused: boolean;
  status: WorkStatus;
  missionTitle: string | null;
  progress: number;
  completed: number;
  errors: string[];
  travelTo: AgentId | null;
  travelUntil: number;
}

interface Persisted {
  version: 1;
  settings: Settings;
  capital: number;
  startingCapital: number;
  revenue: number;
  adSpend: number;
  productCosts: number;
  fees: number;
  refunds: number;
  orders: number;
  products: Product[];
  creatives: Creative[];
  campaigns: Campaign[];
  missions: Mission[];
  messages: AgentMessage[];
  log: LogEntry[];
  approvals: Approval[];
  history: HistPoint[];
  cycle: number;
  producedInCycle: number;
  seq: number;
  pumps: number;
  agentMeta: Record<AgentId, { completed: number; errors: string[] }>;
}

function emptyAgent(): AgentState {
  return {
    enabled: false,
    paused: false,
    status: "IDLE",
    missionTitle: null,
    progress: 0,
    completed: 0,
    errors: [],
    travelTo: null,
    travelUntil: 0,
  };
}

const OPEN: WorkStatus[] = ["QUEUED", "THINKING", "WORKING", "COMMUNICATING"];

export class SimulationEngine {
  private settings: Settings = defaultSettings();
  private capital = 10000;
  private startingCapital = 10000;
  private revenue = 0;
  private adSpend = 0;
  private productCosts = 0;
  private fees = 0;
  private refunds = 0;
  private orders = 0;
  private products: Product[] = [];
  private creatives: Creative[] = [];
  private campaigns: Campaign[] = [];
  private missions: Mission[] = [];
  private messages: AgentMessage[] = [];
  private activity: LogEntry[] = [];
  private approvals: Approval[] = [];
  private history: HistPoint[] = [];
  private pulses: Pulse[] = [];
  private agents: Record<AgentId, AgentState>;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private cycle = 1;
  private producedInCycle = 0;
  private seq = 1;
  private pumps = 0;
  private broke = false;
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.agents = {
      research: emptyAgent(),
      creative: emptyAgent(),
      media: emptyAgent(),
      optimization: emptyAgent(),
      you: emptyAgent(),
    };
    this.log("Système prêt. Moteur local — aucun argent réel, aucun modèle externe.");
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getSettings(): Settings {
    return {
      ...this.settings,
      robotColors: { ...this.settings.robotColors },
    };
  }

  snapshot(): Snapshot {
    const netProfit = this.netProfit();
    const losses = money(
      this.refunds +
        this.campaigns
          .filter((c) => c.status === "KILLED" || c.status === "ENDED")
          .reduce((sum, c) => sum + Math.max(0, c.spent - c.revenue), 0),
    );
    const now = Date.now();
    return {
      capital: this.capital,
      startingCapital: this.startingCapital,
      revenue: this.revenue,
      adSpend: this.adSpend,
      productCosts: this.productCosts,
      fees: this.fees,
      refunds: this.refunds,
      netProfit,
      losses,
      orders: this.orders,
      roas: this.adSpend > 0 ? money(this.revenue / this.adSpend) : 0,
      cpa: this.orders > 0 ? money(this.adSpend / this.orders) : 0,
      aov: this.orders > 0 ? money(this.revenue / this.orders) : 0,
      activeAgents: WORKERS.filter((id) => this.agents[id].enabled && !this.agents[id].paused).length,
      liveCampaigns: this.campaigns.filter((c) => c.status === "LIVE" || c.status === "SCALED").length,
      products: this.products.map((p) => ({ ...p })),
      creatives: this.creatives.map((c) => ({ ...c })),
      campaigns: this.campaigns.map((c) => ({ ...c })),
      missions: this.missions.map((m) => ({ ...m })),
      messages: this.messages.map((m) => ({ ...m })),
      log: this.activity.map((l) => ({ ...l })),
      approvals: this.approvals.map((a) => ({ ...a })),
      history: this.history.map((h) => ({ ...h })),
      agents: (Object.keys(this.agents) as AgentId[]).map((id) => this.viewAgent(id, now)),
      pulses: this.pulses.filter((p) => now - p.at < 2600).map((p) => ({ ...p })),
      cycle: this.cycle,
      running: this.running,
      brain: activeBrain.label,
      producedInCycle: this.producedInCycle,
    };
  }

  booksOk(): boolean {
    const profit = money(this.revenue - this.adSpend - this.productCosts - this.fees - this.refunds);
    const capital = money(this.startingCapital + profit);
    return Math.abs(this.capital - capital) < 0.02 && Math.abs(this.netProfit() - profit) < 0.02;
  }

  updateSettings(partial: Partial<Settings>) {
    const next = { ...this.settings, ...partial, robotColors: { ...this.settings.robotColors } };
    if (partial.robotColors) next.robotColors = { ...next.robotColors, ...partial.robotColors };
    next.productBatch = Math.round(clamp(next.productBatch, 1, 24));
    next.maxLiveCampaigns = Math.round(clamp(next.maxLiveCampaigns, 1, 12));
    next.budgetPerCampaign = money(clamp(next.budgetPerCampaign, 20, 2000));
    next.campaignBeats = Math.round(clamp(next.campaignBeats, 6, 28));
    next.simSpeed = clamp(next.simSpeed, 0.5, 3);
    next.risk = clamp(next.risk, 0.05, 0.85);
    next.targetRoas = clamp(next.targetRoas, 1.2, 6);
    next.autoApproveBudget = money(clamp(next.autoApproveBudget, 20, 2000));
    next.glow = clamp(next.glow, 0.2, 1);
    next.animSpeed = clamp(next.animSpeed, 0.5, 2);
    next.particles = clamp(next.particles, 0, 1);
    next.sound = Boolean(next.sound);
    next.performanceMode = Boolean(next.performanceMode);
    next.showFloor = next.showFloor !== false;
    if (next.theme !== "midnight" && next.theme !== "void" && next.theme !== "aurora") next.theme = "midnight";
    (Object.keys(next.robotColors) as AgentId[]).forEach((id) => {
      const color = next.robotColors[id];
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) next.robotColors[id] = this.settings.robotColors[id];
    });
    if (partial.debugOutcome === undefined) next.debugOutcome = this.settings.debugOutcome;
    if (partial.debugOutcome === "win" || partial.debugOutcome === "lose") next.debugOutcome = partial.debugOutcome;
    this.settings = next;
    if (this.running) this.kick();
    this.emit();
  }

  setCapital(amount: number): boolean {
    if (this.running) {
      this.log("Arrêtez la simulation avant de modifier le capital.", true);
      return false;
    }
    const n = money(amount);
    if (!Number.isFinite(n) || n < 100) {
      this.log("Capital refusé — minimum 100 €.", true);
      return false;
    }
    this.startingCapital = n;
    this.revenue = 0;
    this.adSpend = 0;
    this.productCosts = 0;
    this.fees = 0;
    this.refunds = 0;
    this.orders = 0;
    this.campaigns = [];
    this.history = [];
    this.broke = false;
    this.recompute();
    this.log(`Capital de départ défini à ${n.toFixed(2)} €. Compteurs remis à zéro.`, true);
    return true;
  }

  startAll(opts?: { timer?: boolean }) {
    WORKERS.forEach((id) => this.enableWorker(id));
    this.agents.you.enabled = true;
    this.running = true;
    this.log("START ALL — l'armée est en ligne.");
    this.fx("start");
    this.pump();
    if (opts?.timer !== false) this.kick();
  }

  stopAll() {
    this.running = false;
    this.clearTimer();
    WORKERS.forEach((id) => this.disableWorker(id));
    this.agents.you.enabled = false;
    this.agents.you.paused = false;
    this.syncYou();
    this.log("STOP ALL — opérations gelées. Aucun nouveau prélèvement.", true);
  }

  startAgent(id: AgentId) {
    if (id === "you") {
      this.agents.you.enabled = true;
      this.agents.you.paused = false;
      this.syncYou();
      this.log("YOU prend la supervision.", true);
      return;
    }
    this.enableWorker(id);
    this.running = true;
    this.log(`${AGENT_META[id].name} démarré.`, true);
    this.pump();
    this.kick();
  }

  stopAgent(id: AgentId) {
    if (id === "you") {
      this.agents.you.enabled = false;
      this.syncYou();
      this.log("YOU quitte le poste. Les validations en attente restent affichées.", true);
      return;
    }
    this.disableWorker(id);
    this.log(`${AGENT_META[id].name} arrêté.`);
    if (!WORKERS.some((w) => this.agents[w].enabled)) {
      this.running = false;
      this.clearTimer();
    }
    this.emit();
  }

  pauseAgent(id: AgentId) {
    const agent = this.agents[id];
    if (!agent.enabled) return;
    agent.paused = true;
    agent.status = "PAUSED";
    this.log(`${AGENT_META[id].name} en pause.`, true);
  }

  resumeAgent(id: AgentId) {
    const agent = this.agents[id];
    if (!agent.enabled) {
      this.startAgent(id);
      return;
    }
    agent.paused = false;
    agent.status = "WORKING";
    this.log(`${AGENT_META[id].name} reprend.`, true);
    if (id !== "you") {
      this.running = true;
      this.pump();
      this.kick();
    }
  }

  approve(approvalId: string, approved: boolean) {
    const idx = this.approvals.findIndex((a) => a.id === approvalId);
    if (idx < 0) return;
    const app = this.approvals[idx];
    if (!app) return;
    const camp = this.campaigns.find((c) => c.id === app.campaignId);
    this.approvals.splice(idx, 1);
    if (!camp) {
      this.syncYou();
      this.emit();
      return;
    }
    if (!approved) {
      camp.dismissed = app.type;
      if (app.type === "launch") camp.status = "KILLED";
      this.log(`YOU a refusé : ${app.message}`);
      this.say("you", "optimization", `Décision refusée pour ${app.product}.`, "result");
    } else if (app.type === "scale") {
      camp.budget = money(camp.budget + app.amount);
      camp.status = "SCALED";
      camp.scaled = true;
      this.log(`YOU approuve le scale de ${app.product} : +${app.amount.toFixed(0)} € de budget virtuel.`);
      this.fx("approve");
    } else if (app.type === "kill") {
      camp.status = "KILLED";
      this.log(`YOU coupe ${app.product}. Dépense figée à ${camp.spent.toFixed(2)} €.`);
      this.fx("approve");
    } else if (app.type === "launch") {
      camp.status = "LIVE";
      camp.startTime = Date.now();
      this.log(`YOU autorise la campagne ${app.product} — budget virtuel ${camp.budget.toFixed(0)} €.`);
      this.fx("approve");
    }
    this.syncYou();
    this.emit();
  }

  reset() {
    this.stopAll();
    this.revenue = 0;
    this.adSpend = 0;
    this.productCosts = 0;
    this.fees = 0;
    this.refunds = 0;
    this.orders = 0;
    this.products = [];
    this.creatives = [];
    this.campaigns = [];
    this.missions = [];
    this.messages = [];
    this.activity = [];
    this.approvals = [];
    this.history = [];
    this.pulses = [];
    this.cycle = 1;
    this.producedInCycle = 0;
    this.pumps = 0;
    this.broke = false;
    (Object.keys(this.agents) as AgentId[]).forEach((id) => {
      this.agents[id] = emptyAgent();
    });
    this.recompute();
    this.log("Simulation réinitialisée. Capital conservé.", true);
  }

  exportJson(): string {
    return JSON.stringify(this.serialize());
  }

  importJson(raw: string): { ok: true } | { ok: false; error: string } {
    try {
      const data = JSON.parse(raw) as Persisted;
      if (!data || data.version !== 1 || !Array.isArray(data.products) || !Array.isArray(data.campaigns)) {
        return { ok: false, error: "Fichier invalide." };
      }
      this.clearTimer();
      this.running = false;
      this.apply(data);
      this.log("Configuration importée. Relancez START pour continuer.", true);
      return { ok: true };
    } catch {
      return { ok: false, error: "Lecture impossible." };
    }
  }

  hydrate() {
    if (typeof localStorage === "undefined") {
      this.emit();
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.emit();
      return;
    }
    try {
      const data = JSON.parse(raw) as Persisted;
      if (data?.version === 1) {
        this.apply(data);
        this.running = false;
        this.log("Session restaurée. Les compteurs sont repris — START relance le cycle sans redépenser l'historique.");
      }
    } catch {
      this.log("Sauvegarde illisible — nouvelle session.");
    }
    this.emit();
  }

  dispose() {
    this.clearTimer();
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = null;
  }

  pump() {
    this.pumps += 1;
    const now = Date.now();
    (Object.keys(this.agents) as AgentId[]).forEach((id) => {
      const agent = this.agents[id];
      if (agent.travelUntil && now > agent.travelUntil) {
        agent.travelTo = null;
        agent.travelUntil = 0;
      }
    });

    WORKERS.forEach((id) => {
      const agent = this.agents[id];
      if (!agent.enabled) return;
      if (agent.paused) {
        agent.status = "PAUSED";
        return;
      }
      const active = this.missions.find((m) => m.agent === id && OPEN.includes(m.status) && m.status !== "QUEUED");
      if (active) {
        this.advance(active);
        return;
      }
      let queued = this.missions.find((m) => m.agent === id && m.status === "QUEUED");
      if (!queued) {
        agent.status = "WORKING";
        agent.missionTitle = "Surveillance du flux";
        agent.progress = 0;
        this.sweep(id);
        queued = this.missions.find((m) => m.agent === id && m.status === "QUEUED");
      }
      if (queued) this.begin(queued);
    });

    if (this.running) this.tickFinance();
    this.syncYou();
    if (this.running) {
      this.history.push({
        t: this.pumps,
        capital: this.capital,
        revenue: this.revenue,
        adSpend: this.adSpend,
        netProfit: this.netProfit(),
        orders: this.orders,
      });
      if (this.history.length > 90) this.history.shift();
    }
    this.trim();
    this.emit();
  }

  private enableWorker(id: AgentId) {
    const agent = this.agents[id];
    agent.enabled = true;
    agent.paused = false;
    agent.status = "WORKING";
    agent.missionTitle = "Surveillance du flux";
  }

  private disableWorker(id: AgentId) {
    const agent = this.agents[id];
    agent.enabled = false;
    agent.paused = false;
    agent.status = "STOPPED";
    agent.missionTitle = null;
    agent.progress = 0;
    agent.travelTo = null;
    this.missions.forEach((m) => {
      if (m.agent === id && OPEN.includes(m.status)) m.status = "STOPPED";
    });
  }

  private sweep(id: AgentId) {
    if (id === "research") this.sweepResearch();
    else if (id === "creative") this.sweepCreative();
    else if (id === "media") this.sweepMedia();
    else if (id === "optimization") this.sweepOptimization();
  }

  private sweepResearch() {
    if (this.openFor("research")) return;
    if (this.producedInCycle >= this.settings.productBatch) {
      if (this.pipelineIdle()) {
        this.producedInCycle = 0;
        this.cycle += 1;
        this.log(`Cycle ${this.cycle} — la recherche reprend.`);
        this.say("research", "broadcast", `Cycle ${this.cycle} démarré.`, "status");
      }
      return;
    }
    if (this.liveCount() >= this.settings.maxLiveCampaigns) return;
    this.queue({
      kind: "research",
      agent: "research",
      title: "Analyse de niche",
      description: "Balayage des signaux de demande, concurrence et marge.",
      priority: "normal",
      to: "creative",
      dedupeKey: `research:${this.cycle}:${this.producedInCycle}`,
    });
  }

  private sweepCreative() {
    if (this.openFor("creative")) return;
    const product = this.products.find(
      (p) =>
        p.score >= PASS_SCORE &&
        !this.creatives.some((c) => c.productId === p.id) &&
        !this.missions.some((m) => m.dedupeKey === `creative:${p.id}` && m.status !== "STOPPED" && m.status !== "ERROR"),
    );
    if (!product) return;
    this.queue({
      kind: "creative",
      agent: "creative",
      title: `Concepts — ${product.name}`,
      description: "Trois angles, un script, un score créatif.",
      priority: "high",
      to: "media",
      dedupeKey: `creative:${product.id}`,
      refId: product.id,
      payload: { product },
    });
  }

  private sweepMedia() {
    if (this.openFor("media")) return;
    if (this.liveCount() >= this.settings.maxLiveCampaigns) return;
    const ready = this.creatives
      .filter((c) => c.status === "Ready")
      .sort((a, b) => b.score - a.score);
    const creative = ready.find((c) => !this.missions.some((m) => m.dedupeKey === `media:${c.productId}` && OPEN.includes(m.status)));
    if (!creative) return;
    const product = this.products.find((p) => p.id === creative.productId);
    if (!product) return;
    if (this.capital < this.settings.budgetPerCampaign && this.capital < 20) {
      this.log("Media Buying : capital trop bas pour une nouvelle campagne.");
      return;
    }
    this.queue({
      kind: "media",
      agent: "media",
      title: `Campagne — ${product.name}`,
      description: "Création virtuelle, budget, plateforme.",
      priority: "high",
      to: "optimization",
      dedupeKey: `media:${product.id}`,
      refId: creative.id,
      payload: { product },
    });
  }

  private sweepOptimization() {
    if (this.openFor("optimization")) return;
    const camp = this.campaigns.find(
      (c) =>
        (c.status === "LIVE" || c.status === "SCALED") &&
        this.pumps - c.lastOptPump >= 4 &&
        !this.approvals.some((a) => a.campaignId === c.id) &&
        !this.missions.some((m) => m.dedupeKey === `opt:${c.id}` && OPEN.includes(m.status)),
    );
    if (!camp) return;
    this.queue({
      kind: "optimize",
      agent: "optimization",
      title: `Lecture — ${camp.product}`,
      description: "ROAS, CPA, décision de budget virtuel.",
      priority: camp.roas > 0 && camp.roas < 1 ? "critical" : "normal",
      to: "you",
      dedupeKey: `opt:${camp.id}:${this.pumps}`,
      refId: camp.id,
      payload: { campaignId: camp.id },
    });
  }

  private queue(input: Omit<Mission, "id" | "createdAt" | "progress" | "status">) {
    if (this.missions.some((m) => m.dedupeKey === input.dedupeKey && OPEN.includes(m.status))) return;
    const mission: Mission = {
      ...input,
      id: this.nid("msn"),
      createdAt: Date.now(),
      progress: 0,
      status: "QUEUED",
    };
    this.missions.unshift(mission);
  }

  private begin(m: Mission) {
    m.status = "THINKING";
    m.startedAt = Date.now();
    m.progress = 8;
    const agent = this.agents[m.agent];
    agent.status = "THINKING";
    agent.missionTitle = m.title;
    agent.progress = m.progress;
    try {
      if (m.kind === "research") {
        const product = this.rollProduct();
        m.payload = { product };
        m.to = product.score >= PASS_SCORE ? "creative" : undefined;
        this.say("research", "broadcast", `Recherche de produits démarrée. Niche ${product.niche}.`, "status");
      } else if (m.kind === "creative" && m.payload?.product) {
        m.payload.creatives = this.rollCreatives(m.payload.product);
        this.say("creative", "research", `Nouveau produit reçu : ${m.payload.product.name}.`, "status");
      } else if (m.kind === "media" && m.payload?.product) {
        m.to = this.settings.budgetPerCampaign > this.settings.autoApproveBudget ? "you" : "optimization";
        this.say("media", "creative", `Concepts en cours d'affectation pour ${m.payload.product.name}.`, "status");
      } else if (m.kind === "optimize") {
        this.say("optimization", "media", "Lecture des performances en cours.", "status");
      }
    } catch (error) {
      this.fail(m, error);
    }
  }

  private advance(m: Mission) {
    if (m.applied) return;
    m.progress = Math.min(100, m.progress + 22 + this.rng() * 12);
    const agent = this.agents[m.agent];
    if (m.progress < 36) m.status = "THINKING";
    else if (m.progress < 78) m.status = "WORKING";
    else if (m.progress < 100 && m.to) m.status = "COMMUNICATING";
    else if (m.progress < 100) m.status = "WORKING";
    agent.status = m.status;
    agent.progress = m.progress;
    agent.missionTitle = m.title;
    if (m.status === "COMMUNICATING" && m.to && !m.pulsed) {
      m.pulsed = true;
      this.emitPulse(m.agent, m.to);
      agent.travelTo = m.to;
      agent.travelUntil = Date.now() + 1500;
    }
    if (m.progress >= 100) this.complete(m);
  }

  private complete(m: Mission) {
    if (m.applied) return;
    m.applied = true;
    m.progress = 100;
    m.status = "COMPLETED";
    m.completedAt = Date.now();
    m.durationMs = m.startedAt ? m.completedAt - m.startedAt : 0;
    const agent = this.agents[m.agent];
    agent.completed += 1;
    agent.progress = 100;
    agent.status = "COMPLETED";
    try {
      if (m.kind === "research") this.finishResearch(m);
      else if (m.kind === "creative") this.finishCreative(m);
      else if (m.kind === "media") this.finishMedia(m);
      else if (m.kind === "optimize") this.finishOptimize(m);
      this.fx("done");
    } catch (error) {
      this.fail(m, error);
    }
  }

  private finishResearch(m: Mission) {
    const product = m.payload?.product;
    if (!product) return;
    this.products.unshift(product);
    this.producedInCycle += 1;
    this.say(
      "research",
      "broadcast",
      `Produit détecté : ${product.name}. Score de potentiel ${product.score}/100. Demande ${Math.round(product.demand)}, concurrence ${Math.round(product.competition)}.`,
      "result",
    );
    if (product.score >= PASS_SCORE) {
      this.say("research", "creative", `Transmission vers CREATIVE AI — ${product.name} (${product.score}/100).`, "transmit");
      m.result = `Transmis : ${product.name} (${product.score})`;
    } else {
      this.say("research", "broadcast", `${product.name} écarté — score ${product.score}/100 sous le seuil ${PASS_SCORE}.`, "status");
      m.result = `Écarté : ${product.name} (${product.score})`;
      m.to = undefined;
    }
  }

  private finishCreative(m: Mission) {
    const list = m.payload?.creatives ?? [];
    const ranked = [...list].sort((a, b) => b.score - a.score);
    ranked.forEach((c, index) => {
      c.status = index === 0 ? "Ready" : "Ready";
      this.creatives.unshift(c);
    });
    const best = ranked[0];
    if (!best) return;
    this.say(
      "creative",
      "media",
      `Trois concepts générés pour ${best.product}. Meilleur score créatif ${best.score}/100 — « ${best.hook} ».`,
      "transmit",
    );
    m.result = `3 concepts · meilleur ${best.score}`;
  }

  private finishMedia(m: Mission) {
    const product = m.payload?.product;
    if (!product) return;
    const concepts = this.creatives.filter((c) => c.productId === product.id && c.status === "Ready");
    const best = [...concepts].sort((a, b) => b.score - a.score)[0];
    if (!best) {
      m.result = "Aucun concept prêt.";
      return;
    }
    const budget = this.settings.budgetPerCampaign;
    const isWinner = this.settings.debugOutcome
      ? this.settings.debugOutcome === "win"
      : this.rng() > this.settings.risk;
    const campaign: Campaign = {
      id: this.nid("cmp"),
      productId: product.id,
      product: product.name,
      creativeId: best.id,
      hook: best.hook,
      platform: PLATFORMS[Math.floor(this.rng() * PLATFORMS.length)] ?? "Meta",
      budget,
      initialBudget: budget,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
      cpa: 0,
      ctr: 0,
      status: budget > this.settings.autoApproveBudget ? "PENDING" : "LIVE",
      isWinner,
      price: product.price,
      cost: product.cost,
      startTime: Date.now(),
      lastOptPump: this.pumps,
      scaled: false,
    };
    this.campaigns.unshift(campaign);
    concepts.forEach((c) => {
      c.status = c.id === best.id ? "Launched" : "Standby";
    });
    if (campaign.status === "PENDING") {
      this.pushApproval({
        type: "launch",
        campaignId: campaign.id,
        product: campaign.product,
        message: `Autoriser ${campaign.product} sur ${campaign.platform} ? Budget virtuel ${budget.toFixed(0)} €.`,
        amount: budget,
      });
      m.result = `En attente de validation · ${budget.toFixed(0)} €`;
      this.say("media", "you", `Budget de simulation ${budget.toFixed(0)} € au-dessus du seuil. Validation requise.`, "approval");
    } else {
      m.result = `Live ${campaign.platform} · ${budget.toFixed(0)} €`;
      this.say(
        "media",
        "optimization",
        `Trois concepts reçus. Campagne virtuelle créée sur ${campaign.platform}. Budget de simulation attribué : ${budget.toFixed(0)} €.`,
        "transmit",
      );
    }
  }

  private finishOptimize(m: Mission) {
    const camp = this.campaigns.find((c) => c.id === m.payload?.campaignId);
    if (!camp || (camp.status !== "LIVE" && camp.status !== "SCALED")) {
      m.result = "Campagne déjà close.";
      return;
    }
    camp.lastOptPump = this.pumps;
    if (camp.spent < camp.budget * 0.2) {
      m.result = "Trop tôt pour décider.";
      this.say("optimization", "broadcast", `${camp.product} : données insuffisantes, surveillance maintenue.`, "status");
      return;
    }
    const roas = camp.roas;
    if (roas >= this.settings.targetRoas && camp.isWinner && camp.dismissed !== "scale" && camp.budget < camp.initialBudget * 4) {
      const amount = money(Math.max(20, camp.budget * 0.5));
      this.pushApproval({
        type: "scale",
        campaignId: camp.id,
        product: camp.product,
        message: `Scaler ${camp.product} ? ROAS ${roas.toFixed(2)}x — budget virtuel +${amount.toFixed(0)} €.`,
        amount,
      });
      m.result = `Scale recommandé · ROAS ${roas.toFixed(2)}x`;
      this.say("optimization", "you", `Campagne analysée. ${camp.product} performe à ${roas.toFixed(2)}x. Augmentation recommandée.`, "approval");
      return;
    }
    if (roas < 1.15 && !camp.isWinner && camp.dismissed !== "kill") {
      this.pushApproval({
        type: "kill",
        campaignId: camp.id,
        product: camp.product,
        message: `Couper ${camp.product} ? ROAS ${roas.toFixed(2)}x — le coût d'acquisition est trop élevé.`,
        amount: 0,
      });
      m.result = `Coupe recommandée · ROAS ${roas.toFixed(2)}x`;
      this.say("optimization", "you", `Coût d'acquisition trop élevé sur ${camp.product} (ROAS ${roas.toFixed(2)}x). Réduction recommandée.`, "approval");
      return;
    }
    m.result = `Stable · ROAS ${roas.toFixed(2)}x`;
    this.say("optimization", "broadcast", `${camp.product} reste en observation. ROAS ${roas.toFixed(2)}x.`, "result");
  }

  private tickFinance() {
    this.campaigns.forEach((camp) => {
      if (camp.status !== "LIVE" && camp.status !== "SCALED") return;
      const remaining = money(camp.budget - camp.spent);
      if (remaining <= 0.05) {
        camp.status = "ENDED";
        this.log(`${camp.product} : budget virtuel consommé.`);
        return;
      }
      if (this.capital <= 0) {
        camp.status = "ENDED";
        if (!this.broke) {
          this.broke = true;
          this.log("Capital épuisé — dépenses publicitaires suspendues.");
          this.fx("alert");
        }
        return;
      }
      const slice = 1 / this.settings.campaignBeats;
      const raw = camp.budget * slice * (0.75 + this.rng() * 0.5);
      const actual = money(Math.min(remaining, raw, Math.max(0, this.capital)));
      if (actual <= 0) return;
      camp.spent = money(camp.spent + actual);
      this.adSpend = money(this.adSpend + actual);
      if (camp.budget - camp.spent <= 0.05) camp.status = "ENDED";

      const impressions = Math.max(0, Math.floor(actual * (70 + this.rng() * 90)));
      const ctr = camp.isWinner ? 0.02 + this.rng() * 0.03 : 0.004 + this.rng() * 0.012;
      const clicks = Math.floor(impressions * ctr);
      const cvr = camp.isWinner ? 0.03 + this.rng() * 0.04 : 0.004 + this.rng() * 0.012;
      const conversions = Math.floor(clicks * cvr);
      const revenue = money(conversions * camp.price);
      const productCost = money(conversions * camp.cost);
      const fees = money(revenue * 0.03);
      const refundAmount = this.rng() < 0.05 ? money(revenue * 0.1) : 0;

      camp.impressions += impressions;
      camp.clicks += clicks;
      camp.conversions += conversions;
      camp.revenue = money(camp.revenue + revenue);
      camp.ctr = camp.impressions > 0 ? money((camp.clicks / camp.impressions) * 100) : 0;
      camp.cpa = camp.conversions > 0 ? money(camp.spent / camp.conversions) : 0;
      camp.roas = camp.spent > 0 ? money(camp.revenue / camp.spent) : 0;

      this.revenue = money(this.revenue + revenue);
      this.productCosts = money(this.productCosts + productCost);
      this.fees = money(this.fees + fees);
      this.refunds = money(this.refunds + refundAmount);
      this.orders += conversions;
      this.recompute();
      if (conversions > 0) {
        this.log(`Vente virtuelle +${revenue.toFixed(2)} € · ${camp.product} · ${conversions} commande${conversions > 1 ? "s" : ""}.`);
      }
    });
  }

  private pushApproval(input: Omit<Approval, "id" | "createdAt">) {
    if (this.approvals.some((a) => a.campaignId === input.campaignId && a.type === input.type)) return;
    this.approvals.unshift({ ...input, id: this.nid("apr"), createdAt: Date.now() });
    this.fx("notify");
  }

  private rollProduct(): Product {
    const used = new Set(this.products.map((p) => p.name));
    const pool = CATALOG.filter((item) => !used.has(item.name));
    const source = pool.length ? pool : CATALOG;
    const base = source[Math.floor(this.rng() * source.length)] ?? CATALOG[0]!;
    const price = money(base.basePrice * (1 + (this.rng() - 0.5) * 0.16));
    const margin = clamp(base.margin + (this.rng() - 0.5) * 8, 22, 78);
    const demand = clamp(35 + this.rng() * 60, 1, 99);
    const competition = clamp(12 + this.rng() * 75, 1, 99);
    const trend = clamp(this.rng() * 100, 1, 99);
    const score = Math.round(clamp(demand * 0.35 + (100 - competition) * 0.25 + margin * 0.2 + trend * 0.2, 1, 99));
    return {
      id: this.nid("prd"),
      name: base.name,
      niche: base.niche,
      demand: money(demand),
      competition: money(competition),
      trend: money(trend),
      margin: money(margin),
      score,
      price,
      cost: money(price * (1 - margin / 100)),
      createdAt: Date.now(),
    };
  }

  private rollCreatives(product: Product): Creative[] {
    const styles = ["UGC", "Studio", "Motion"];
    return [0, 1, 2].map((index) => {
      const hook = (HOOKS[Math.floor(this.rng() * HOOKS.length)] ?? HOOKS[0]!).replaceAll("{name}", product.name);
      const score = Math.round(clamp(product.score * 0.55 + this.rng() * 45, 35, 99));
      return {
        id: this.nid("cr"),
        productId: product.id,
        product: product.name,
        hook,
        angle: ANGLES[index % ANGLES.length] ?? "UGC témoignage",
        script: `${hook}. Preuve visuelle de ${product.name}, prix affiché ${priceLabel(product.price)}.`,
        style: styles[index] ?? "UGC",
        score,
        status: "Creating",
        createdAt: Date.now(),
      };
    });
  }

  private fail(m: Mission, error: unknown) {
    const message = error instanceof Error ? error.message : "erreur inconnue";
    m.status = "ERROR";
    m.result = message;
    const agent = this.agents[m.agent];
    agent.status = "ERROR";
    agent.errors.unshift(message);
    agent.errors = agent.errors.slice(0, 6);
    this.log(`Erreur ${AGENT_META[m.agent].name} : ${message}`);
    this.fx("alert");
  }

  private say(from: AgentId, to: AgentId | "broadcast", text: string, kind: AgentMessage["kind"]) {
    this.messages.unshift({ id: this.nid("msg"), from, to, text, at: Date.now(), kind });
    const target = to === "broadcast" ? "salle" : AGENT_META[to].name;
    this.log(`${AGENT_META[from].name} → ${target} : ${text}`);
    if (kind === "transmit") this.fx("transmit");
    else if (kind === "alert") this.fx("alert");
  }

  private emitPulse(from: AgentId, to: AgentId) {
    this.pulses.unshift({ id: this.nid("lnk"), from, to, at: Date.now() });
    this.pulses = this.pulses.slice(0, 8);
  }

  private pipelineIdle() {
    const busy = this.missions.some((m) => OPEN.includes(m.status));
    return !busy && this.liveCount() === 0 && !this.approvals.some((a) => a.type === "launch");
  }

  private liveCount() {
    return this.campaigns.filter((c) => c.status === "LIVE" || c.status === "SCALED" || c.status === "PENDING").length;
  }

  private openFor(id: AgentId) {
    return this.missions.some((m) => m.agent === id && OPEN.includes(m.status));
  }

  private viewAgent(id: AgentId, now: number): AgentView {
    const agent = this.agents[id];
    const meta = AGENT_META[id];
    const traveling = Boolean(agent.travelTo && agent.travelUntil > now);
    let expression: Expression = "idle";
    if (agent.status === "ERROR" || agent.status === "WAITING_APPROVAL") expression = "alert";
    else if (traveling || agent.status === "COMMUNICATING") expression = "talk";
    else if (agent.status === "THINKING" || (id === "research" && agent.status === "WORKING")) expression = "scan";
    else if (agent.status === "COMPLETED") expression = "success";
    else if (agent.status === "WORKING" || agent.status === "PAUSED") expression = "focus";
    let pose: AgentView["pose"] = "home";
    if (traveling) pose = "travel";
    else if (agent.status === "COMMUNICATING") pose = "talk";
    else if (agent.status === "WORKING" || agent.status === "THINKING") pose = "work";
    return {
      id,
      name: meta.name,
      role: meta.role,
      blurb: meta.blurb,
      status: agent.status,
      enabled: agent.enabled,
      paused: agent.paused,
      missionTitle: agent.missionTitle,
      progress: agent.progress,
      pose,
      travelTo: traveling ? agent.travelTo : null,
      expression,
      completed: agent.completed,
      errors: [...agent.errors],
      color: this.settings.robotColors[id],
    };
  }

  private syncYou() {
    const you = this.agents.you;
    if (this.approvals.length > 0) you.status = "WAITING_APPROVAL";
    else if (you.paused) you.status = "PAUSED";
    else if (you.enabled) you.status = "WORKING";
    else you.status = "IDLE";
    you.missionTitle = this.approvals.length > 0 ? `${this.approvals.length} décision${this.approvals.length > 1 ? "s" : ""} à valider` : you.enabled ? "Supervision" : null;
    you.progress = 0;
  }

  private recompute() {
    this.capital = money(this.startingCapital + this.revenue - this.adSpend - this.productCosts - this.fees - this.refunds);
  }

  private netProfit() {
    return money(this.revenue - this.adSpend - this.productCosts - this.fees - this.refunds);
  }

  private trim() {
    if (this.products.length > 40) this.products.length = 40;
    if (this.creatives.length > 60) this.creatives.length = 60;
    if (this.campaigns.length > 40) this.campaigns.length = 40;
    if (this.messages.length > 120) this.messages.length = 120;
    if (this.activity.length > 150) this.activity.length = 150;
    const active = this.missions.filter((m) => OPEN.includes(m.status));
    const done = this.missions.filter((m) => !OPEN.includes(m.status)).slice(0, 70);
    this.missions = [...active, ...done];
  }

  private log(message: string, emitNow = false) {
    this.activity.unshift({ id: this.nid("log"), at: Date.now(), message });
    if (emitNow) this.emit();
  }

  private fx(kind: SoundKind) {
    if (!this.settings.sound) return;
    sound.play(kind);
  }

  private nid(prefix: string) {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
    this.schedulePersist();
  }

  private schedulePersist() {
    if (typeof localStorage === "undefined") return;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
      } catch {
        /* ignore quota */
      }
    }, 350);
  }

  private kick() {
    this.clearTimer();
    if (!this.running) return;
    const ms = Math.max(450, 1500 / this.settings.simSpeed);
    this.timer = setTimeout(() => {
      if (!this.running) return;
      this.pump();
      this.kick();
    }, ms);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private serialize(): Persisted {
    const agentMeta = {} as Persisted["agentMeta"];
    (Object.keys(this.agents) as AgentId[]).forEach((id) => {
      agentMeta[id] = { completed: this.agents[id].completed, errors: [...this.agents[id].errors] };
    });
    return {
      version: 1,
      settings: this.getSettings(),
      capital: this.capital,
      startingCapital: this.startingCapital,
      revenue: this.revenue,
      adSpend: this.adSpend,
      productCosts: this.productCosts,
      fees: this.fees,
      refunds: this.refunds,
      orders: this.orders,
      products: this.products,
      creatives: this.creatives,
      campaigns: this.campaigns,
      missions: this.missions,
      messages: this.messages,
      log: this.activity,
      approvals: this.approvals,
      history: this.history,
      cycle: this.cycle,
      producedInCycle: this.producedInCycle,
      seq: this.seq,
      pumps: this.pumps,
      agentMeta,
    };
  }

  private apply(data: Persisted) {
    this.settings = { ...defaultSettings(), ...data.settings, robotColors: { ...defaultSettings().robotColors, ...data.settings?.robotColors } };
    this.startingCapital = money(data.startingCapital ?? 10000);
    this.revenue = money(data.revenue ?? 0);
    this.adSpend = money(data.adSpend ?? 0);
    this.productCosts = money(data.productCosts ?? 0);
    this.fees = money(data.fees ?? 0);
    this.refunds = money(data.refunds ?? 0);
    this.orders = data.orders ?? 0;
    this.recompute();
    this.products = data.products ?? [];
    this.creatives = data.creatives ?? [];
    this.campaigns = data.campaigns ?? [];
    this.missions = data.missions ?? [];
    this.messages = data.messages ?? [];
    this.activity = data.log ?? [];
    this.approvals = data.approvals ?? [];
    this.history = data.history ?? [];
    this.cycle = data.cycle ?? 1;
    this.producedInCycle = data.producedInCycle ?? 0;
    this.seq = data.seq ?? 1;
    this.pumps = data.pumps ?? 0;
    this.running = false;
    (Object.keys(this.agents) as AgentId[]).forEach((id) => {
      this.agents[id] = emptyAgent();
      this.agents[id].completed = data.agentMeta?.[id]?.completed ?? 0;
      this.agents[id].errors = data.agentMeta?.[id]?.errors ?? [];
    });
    this.syncYou();
  }
}

function priceLabel(price: number) {
  return `${price.toFixed(0)} €`;
}
