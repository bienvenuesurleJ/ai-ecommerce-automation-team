import { useState } from "react";
import { useSim } from "@/lib/sim/store";
import type { AgentId, AgentView } from "@/lib/sim/types";
import { RobotSprite } from "./RobotSprite";

const HOMES: Record<AgentId, { x: number; y: number }> = {
  research: { x: 22, y: 30 },
  creative: { x: 78, y: 30 },
  you: { x: 50, y: 56 },
  media: { x: 22, y: 80 },
  optimization: { x: 78, y: 80 },
};

const ORDER: AgentId[] = ["research", "creative", "you", "media", "optimization"];

function spot(agent: AgentView) {
  const home = HOMES[agent.id];
  if (!agent.travelTo) return home;
  const target = HOMES[agent.travelTo];
  return {
    x: home.x + (target.x - home.x) * 0.42,
    y: home.y + (target.y - home.y) * 0.42,
  };
}

export function CommandCenter() {
  const snap = useSim((s) => s.snap);
  const settings = useSim((s) => s.settings);
  const select = useSim((s) => s.selectAgent);
  const [compact] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(max-width: 820px)").matches : false));
  const particles = settings.performanceMode ? 0 : Math.round(settings.particles * 14);
  const byId = Object.fromEntries(snap.agents.map((a) => [a.id, a])) as Record<AgentId, AgentView>;

  return (
    <section className="panel-block">
      <header className="block-head">
        <div>
          <p className="kicker">Salle de contrôle</p>
          <h2>AI Command Center</h2>
        </div>
        <p className="muted">Cycle {snap.cycle} · {snap.running ? "armée en ligne" : "en attente"} · {snap.liveCampaigns} campagnes live</p>
      </header>
      <div className={`stage ${compact ? "is-compact" : ""} ${settings.showFloor ? "" : "no-floor"}`}>
        {!compact &&
          ORDER.map((id) => (
            <article key={id} className={`bay bay-${id}`} style={{ gridArea: id }}>
              <BayCopy agent={byId[id]} snapLive={snap.liveCampaigns} products={snap.products.length} pending={snap.approvals.length} />
            </article>
          ))}
        {!compact && (
          <svg className="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {snap.pulses.map((pulse) => {
              const a = HOMES[pulse.from];
              const b = HOMES[pulse.to];
              return (
                <g key={pulse.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="1.3" />
                </g>
              );
            })}
          </svg>
        )}
        {!compact &&
          Array.from({ length: particles }, (_, i) => (
            <span key={i} className="particle" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.4}s` }} />
          ))}
        {compact
          ? ORDER.map((id) => (
              <article key={id} className={`bay bay-${id}`}>
                <button type="button" className="robot-hit" onClick={() => select(id)}>
                  <RobotSprite id={id} expression={byId[id].expression} status={byId[id].status} color={byId[id].color} />
                </button>
                <BayCopy agent={byId[id]} snapLive={snap.liveCampaigns} products={snap.products.length} pending={snap.approvals.length} />
              </article>
            ))
          : ORDER.map((id) => {
              const pos = spot(byId[id]);
              return (
                <button
                  key={id}
                  type="button"
                  className="robot-hit robot-abs"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => select(id)}
                >
                  <RobotSprite id={id} expression={byId[id].expression} status={byId[id].status} color={byId[id].color} />
                  <span className="robot-name">{byId[id].name}</span>
                </button>
              );
            })}
      </div>
      {compact && snap.pulses.length > 0 && (
        <ul className="spine">
          {snap.pulses.slice(0, 3).map((p) => (
            <li key={p.id}>
              {p.from} → {p.to}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BayCopy({
  agent,
  products,
  snapLive,
  pending,
}: {
  agent: AgentView;
  products: number;
  snapLive: number;
  pending: number;
}) {
  const line =
    agent.id === "research"
      ? `${products} produits au labo`
      : agent.id === "media"
        ? `${snapLive} campagnes suivies`
        : agent.id === "you"
          ? pending > 0
            ? `${pending} validation${pending > 1 ? "s" : ""}`
            : "Poste central"
          : agent.missionTitle ?? agent.role;
  return (
    <div className="bay-copy">
      <h3>{agent.name}</h3>
      <p>{line}</p>
      <span className={`badge st-${agent.status}`}>{agent.status}</span>
    </div>
  );
}
