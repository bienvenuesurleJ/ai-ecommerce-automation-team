export type AgentId = "research" | "creative" | "media" | "optimization" | "you";

export type WorkStatus =
  | "IDLE"
  | "QUEUED"
  | "WORKING"
  | "THINKING"
  | "COMMUNICATING"
  | "COMPLETED"
  | "ERROR"
  | "STOPPED"
  | "WAITING_APPROVAL"
  | "PAUSED";

export type SectionId =
  | "overview"
  | "command"
  | "agents"
  | "comms"
  | "tasks"
  | "products"
  | "studio"
  | "campaigns"
  | "analytics"
  | "finances"
  | "log"
  | "approvals"
  | "settings";

export type ThemeId = "midnight" | "void" | "aurora";

export type Expression = "idle" | "scan" | "focus" | "talk" | "success" | "alert";

export type MissionKind = "research" | "creative" | "media" | "optimize";

export type MessageKind = "status" | "transmit" | "result" | "alert" | "approval";

export interface Settings {
  productBatch: number;
  maxLiveCampaigns: number;
  budgetPerCampaign: number;
  campaignBeats: number;
  simSpeed: number;
  risk: number;
  targetRoas: number;
  autoApproveBudget: number;
  sound: boolean;
  glow: number;
  animSpeed: number;
  particles: number;
  performanceMode: boolean;
  showFloor: boolean;
  theme: ThemeId;
  robotColors: Record<AgentId, string>;
  /** Test hook. Never set by the UI. */
  debugOutcome?: "win" | "lose";
}

export interface Product {
  id: string;
  name: string;
  niche: string;
  demand: number;
  competition: number;
  trend: number;
  margin: number;
  score: number;
  price: number;
  cost: number;
  createdAt: number;
}

export interface Creative {
  id: string;
  productId: string;
  product: string;
  hook: string;
  angle: string;
  script: string;
  style: string;
  score: number;
  status: "Creating" | "Ready" | "Launched" | "Standby";
  createdAt: number;
}

export type CampaignStatus = "PENDING" | "LIVE" | "SCALED" | "PAUSED" | "KILLED" | "ENDED";

export interface Campaign {
  id: string;
  productId: string;
  product: string;
  creativeId: string;
  hook: string;
  platform: "Meta" | "TikTok" | "Google";
  budget: number;
  initialBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
  ctr: number;
  status: CampaignStatus;
  isWinner: boolean;
  price: number;
  cost: number;
  startTime: number;
  lastOptPump: number;
  dismissed?: "scale" | "kill" | "launch";
  scaled: boolean;
}

export interface Mission {
  id: string;
  kind: MissionKind;
  agent: AgentId;
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  status: WorkStatus;
  result?: string;
  durationMs?: number;
  to?: AgentId;
  dedupeKey: string;
  refId?: string;
  pulsed?: boolean;
  applied?: boolean;
  payload?: {
    product?: Product;
    creatives?: Creative[];
    campaignId?: string;
  };
}

export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | "broadcast";
  text: string;
  at: number;
  kind: MessageKind;
}

export interface LogEntry {
  id: string;
  at: number;
  message: string;
}

export interface Approval {
  id: string;
  type: "scale" | "kill" | "launch";
  campaignId: string;
  product: string;
  message: string;
  amount: number;
  createdAt: number;
}

export interface HistPoint {
  t: number;
  capital: number;
  revenue: number;
  adSpend: number;
  netProfit: number;
  orders: number;
}

export interface Pulse {
  id: string;
  from: AgentId;
  to: AgentId;
  at: number;
}

export interface AgentView {
  id: AgentId;
  name: string;
  role: string;
  blurb: string;
  status: WorkStatus;
  enabled: boolean;
  paused: boolean;
  missionTitle: string | null;
  progress: number;
  pose: "home" | "travel" | "work" | "talk";
  travelTo: AgentId | null;
  expression: Expression;
  completed: number;
  errors: string[];
  color: string;
}

export interface Snapshot {
  capital: number;
  startingCapital: number;
  revenue: number;
  adSpend: number;
  productCosts: number;
  fees: number;
  refunds: number;
  netProfit: number;
  losses: number;
  orders: number;
  roas: number;
  cpa: number;
  aov: number;
  activeAgents: number;
  liveCampaigns: number;
  products: Product[];
  creatives: Creative[];
  campaigns: Campaign[];
  missions: Mission[];
  messages: AgentMessage[];
  log: LogEntry[];
  approvals: Approval[];
  history: HistPoint[];
  agents: AgentView[];
  pulses: Pulse[];
  cycle: number;
  running: boolean;
  brain: string;
  producedInCycle: number;
}

export const AGENT_META: Record<AgentId, { name: string; role: string; blurb: string }> = {
  research: {
    name: "RESEARCH AI",
    role: "Analyse produits et niches",
    blurb: "Analytique, méthodique, observateur.",
  },
  creative: {
    name: "CREATIVE AI",
    role: "Angles et concepts publicitaires",
    blurb: "Créatif, dynamique, imaginatif.",
  },
  media: {
    name: "MEDIA BUYING AI",
    role: "Campagnes et budgets virtuels",
    blurb: "Stratégique, orienté performance.",
  },
  optimization: {
    name: "OPTIMIZATION AI",
    role: "Coupe les pertes, scale les gagnants",
    blurb: "Précis, rigoureux, stratégique.",
  },
  you: {
    name: "YOU",
    role: "Superviseur",
    blurb: "Le propriétaire. Valide les décisions sensibles et contrôle le capital.",
  },
};

export const WORKERS: AgentId[] = ["research", "creative", "media", "optimization"];

export const DEFAULT_COLORS: Record<AgentId, string> = {
  research: "#22d3ee",
  creative: "#b388ff",
  media: "#4f8cff",
  optimization: "#ff8a3d",
  you: "#e8c36a",
};

export function defaultSettings(): Settings {
  return {
    productBatch: 4,
    maxLiveCampaigns: 3,
    budgetPerCampaign: 100,
    campaignBeats: 12,
    simSpeed: 1,
    risk: 0.4,
    targetRoas: 2,
    autoApproveBudget: 150,
    sound: false,
    glow: 0.85,
    animSpeed: 1,
    particles: 0.55,
    performanceMode: false,
    showFloor: true,
    theme: "midnight",
    robotColors: { ...DEFAULT_COLORS },
  };
}

export function money(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
