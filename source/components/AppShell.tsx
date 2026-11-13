import type { CSSProperties } from "react";
import {
  Bot,
  Clapperboard,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Megaphone,
  MessagesSquare,
  Radar,
  ScrollText,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { SimProvider, useSim } from "@/lib/sim/store";
import type { SectionId } from "@/lib/sim/types";
import { clock } from "./format";
import { MetricsStrip } from "./Metrics";
import { AgentDrawer, SectionBody } from "./Panels";

const NAV: { id: SectionId; label: string; icon: typeof Radar }[] = [
  { id: "overview", label: "Vue générale", icon: LayoutDashboard },
  { id: "command", label: "Command Center", icon: Radar },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "comms", label: "Communication", icon: MessagesSquare },
  { id: "tasks", label: "Missions", icon: ListTodo },
  { id: "products", label: "Labo produits", icon: FlaskConical },
  { id: "studio", label: "Studio", icon: Clapperboard },
  { id: "campaigns", label: "Campagnes", icon: Megaphone },
  { id: "analytics", label: "Analytique", icon: LineChart },
  { id: "finances", label: "Finances", icon: Wallet },
  { id: "log", label: "Journal", icon: ScrollText },
  { id: "approvals", label: "Validations", icon: ShieldCheck },
  { id: "settings", label: "Réglages", icon: Settings },
];

export function AppRoot() {
  return (
    <SimProvider>
      <AppShell />
    </SimProvider>
  );
}

function AppShell() {
  const section = useSim((s) => s.ui.section);
  const settings = useSim((s) => s.settings);
  const snap = useSim((s) => s.snap);
  const setSection = useSim((s) => s.setSection);
  const startAll = useSim((s) => s.startAll);
  const stopAll = useSim((s) => s.stopAll);
  const requestReset = useSim((s) => s.requestReset);
  const confirm = useSim((s) => s.ui.confirmReset);
  const reset = useSim((s) => s.reset);
  const update = useSim((s) => s.updateSettings);
  const pending = snap.approvals.length;
  const ticker = snap.log[0];
  const style = {
    "--glow": String(settings.glow),
    "--anim": String(settings.animSpeed),
    "--bot-research": settings.robotColors.research,
    "--bot-creative": settings.robotColors.creative,
    "--bot-media": settings.robotColors.media,
    "--bot-optimization": settings.robotColors.optimization,
    "--bot-you": settings.robotColors.you,
  } as CSSProperties;

  return (
    <div className="shell" data-theme={settings.theme} data-perf={settings.performanceMode ? "1" : "0"} style={style}>
      <header className="topbar">
        <p className="sim-flag">SIMULATION ONLY — NO REAL MONEY SPENT</p>
        <div className="top-row">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <div>
              <p className="kicker">E-commerce automation</p>
              <h1>AI Command Center</h1>
            </div>
          </div>
          <div className="row-btns">
            <button type="button" className="go" onClick={startAll}>Start all</button>
            <button type="button" className="stop" onClick={stopAll}>Stop all</button>
            <button type="button" onClick={() => requestReset(true)}>Reset</button>
            <button
              type="button"
              aria-pressed={settings.sound}
              aria-label={settings.sound ? "Couper le son" : "Activer le son"}
              onClick={() => update({ sound: !settings.sound })}
            >
              {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button type="button" className="gold" onClick={() => setSection("approvals")}>
              Validations {pending > 0 ? `(${pending})` : ""}
            </button>
          </div>
        </div>
        <p className="ticker">{ticker ? `${clock(ticker.at)}  ${ticker.message}` : "En attente du premier ordre."}</p>
      </header>
      <div className="workspace">
        <nav className="nav" aria-label="Sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={section === item.id ? "on" : ""} onClick={() => setSection(item.id)}>
                <Icon size={18} />
                {item.label}
                {item.id === "approvals" && pending > 0 ? <em>{pending}</em> : null}
              </button>
            );
          })}
        </nav>
        <main>
          <SectionBody section={section} />
        </main>
      </div>
      <MetricsStrip />
      <AgentDrawer />
      {confirm && (
        <div className="drawer-root">
          <button type="button" className="backdrop" aria-label="Annuler" onClick={() => requestReset(false)} />
          <div className="modal" role="dialog" aria-label="Réinitialiser">
            <h2>Réinitialiser la simulation ?</h2>
            <p>Les produits, campagnes et le journal seront effacés. Le capital de départ reste.</p>
            <div className="row-btns">
              <button type="button" className="stop" onClick={reset}>Confirmer</button>
              <button type="button" onClick={() => requestReset(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Boot() {
  return (
    <main className="boot">
      <p className="sim-flag">SIMULATION ONLY — NO REAL MONEY SPENT</p>
      <h1>AI Command Center</h1>
      <p>Initialisation du poste de supervision…</p>
    </main>
  );
}
