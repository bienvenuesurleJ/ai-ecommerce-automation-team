import { useSim } from "@/lib/sim/store";
import type { AgentId, SectionId } from "@/lib/sim/types";
import { CommandCenter } from "./CommandCenter";
import { clock, eur } from "./format";
import { FinanceCharts, StatValue } from "./Metrics";
import { RobotSprite } from "./RobotSprite";

export function SectionBody({ section }: { section: SectionId }) {
  if (section === "overview") return <Overview />;
  if (section === "command") return <CommandCenter />;
  if (section === "agents") return <Agents />;
  if (section === "comms") return <Comms />;
  if (section === "tasks") return <Tasks />;
  if (section === "products") return <Products />;
  if (section === "studio") return <Studio />;
  if (section === "campaigns") return <Campaigns />;
  if (section === "analytics") return <Analytics />;
  if (section === "finances") return <Finances />;
  if (section === "log") return <Log />;
  if (section === "approvals") return <Approvals />;
  return <SettingsPanel />;
}

function Overview() {
  const snap = useSim((s) => s.snap);
  const setSection = useSim((s) => s.setSection);
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">Entreprise virtuelle</p>
          <h2>Vue générale</h2>
        </div>
        <p className="muted">{snap.brain}</p>
      </header>
      <div className="stat-grid">
        <Big label="Capital disponible" value={snap.capital} />
        <Big label="Chiffre d'affaires" value={snap.revenue} />
        <Big label="Bénéfice net" value={snap.netProfit} />
        <Big label="Pertes réalisées" value={snap.losses} />
        <Big label="Dépenses pub" value={snap.adSpend} />
        <Big label="Commandes" value={snap.orders} format="num" />
        <Big label="ROAS global" value={snap.roas} format="x" />
        <Big label="Coût d'acquisition" value={snap.cpa} />
        <Big label="Panier moyen" value={snap.aov} />
        <Big label="Agents actifs" value={snap.activeAgents} format="num" />
        <Big label="Campagnes live" value={snap.liveCampaigns} format="num" />
        <Big label="Frais + remboursements" value={snap.fees + snap.refunds} />
      </div>
      <ol className="pipeline">
        {[
          ["FIND", snap.products.length],
          ["CREATE", snap.creatives.length],
          ["TEST", snap.campaigns.length],
          ["ANALYZE", snap.missions.filter((m) => m.kind === "optimize" && m.status === "COMPLETED").length],
          ["SCALE", snap.approvals.length],
          ["REPEAT", snap.cycle],
        ].map(([label, count]) => (
          <li key={String(label)}>
            <span>{label}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ol>
      <div className="split">
        <article className="card">
          <h3>Derniers signaux</h3>
          <MessageList limit={5} />
        </article>
        <article className="card">
          <h3>Agents</h3>
          <ul className="agent-mini">
            {snap.agents.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setSection("agents")}>
                  <i style={{ background: a.color }} />
                  {a.name}
                  <em className={`st-${a.status}`}>{a.status}</em>
                </button>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <FinanceCharts />
    </div>
  );
}

function Big({ label, value, format = "eur" }: { label: string; value: number; format?: "eur" | "num" | "x" }) {
  return (
    <article className="card stat-card">
      <span>{label}</span>
      <StatValue value={value} format={format} />
    </article>
  );
}

function Agents() {
  const agents = useSim((s) => s.snap.agents);
  const select = useSim((s) => s.selectAgent);
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">Équipe</p>
          <h2>Agents IA</h2>
        </div>
      </header>
      <div className="agent-grid">
        {agents.map((a) => (
          <article key={a.id} className="card agent-card">
            <button type="button" className="agent-open" onClick={() => select(a.id)}>
              <RobotSprite id={a.id} expression={a.expression} status={a.status} color={a.color} />
              <div>
                <h3>{a.name}</h3>
                <p>{a.role}</p>
                <p className="muted">{a.blurb}</p>
                <span className={`badge st-${a.status}`}>{a.status}</span>
              </div>
            </button>
            <p className="mission-line">{a.missionTitle ?? "Aucune mission"}</p>
            <div className="bar"><span style={{ width: `${Math.min(100, a.progress)}%` }} /></div>
            <Controls id={a.id} />
          </article>
        ))}
      </div>
    </div>
  );
}

export function Controls({ id }: { id: AgentId }) {
  const start = useSim((s) => s.startAgent);
  const stop = useSim((s) => s.stopAgent);
  const pause = useSim((s) => s.pauseAgent);
  const resume = useSim((s) => s.resumeAgent);
  const view = useSim((s) => s.viewTasks);
  return (
    <div className="row-btns">
      <button type="button" onClick={() => start(id)}>Start</button>
      <button type="button" onClick={() => stop(id)}>Stop</button>
      <button type="button" onClick={() => pause(id)}>Pause</button>
      <button type="button" onClick={() => resume(id)}>Reprendre</button>
      <button type="button" onClick={() => view(id)}>Missions</button>
    </div>
  );
}

function Comms() {
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">Bus interne</p>
          <h2>Communication</h2>
        </div>
      </header>
      <MessageList limit={80} />
    </div>
  );
}

function MessageList({ limit }: { limit: number }) {
  const messages = useSim((s) => s.snap.messages);
  if (messages.length === 0) return <p className="empty">Aucun message. Lancez START ALL pour ouvrir le cycle.</p>;
  return (
    <ul className="feed">
      {messages.slice(0, limit).map((m) => (
        <li key={m.id} className={`msg kind-${m.kind}`}>
          <time>{clock(m.at)}</time>
          <b>{m.from}</b>
          <span>→ {m.to}</span>
          <p>{m.text}</p>
        </li>
      ))}
    </ul>
  );
}

function Tasks() {
  const missions = useSim((s) => s.snap.missions);
  const filter = useSim((s) => s.ui.taskAgent);
  const view = useSim((s) => s.viewTasks);
  const rows = missions.filter((m) => filter === "all" || m.agent === filter);
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">File</p>
          <h2>Missions</h2>
        </div>
        <div className="row-btns">
          {(["all", "research", "creative", "media", "optimization", "you"] as const).map((id) => (
            <button key={id} type="button" className={filter === id ? "on" : ""} onClick={() => view(id)}>
              {id}
            </button>
          ))}
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="empty">La file est vide.</p>
      ) : (
        <ul className="feed">
          {rows.map((m) => (
            <li key={m.id}>
              <div className="task-top">
                <b>{m.title}</b>
                <span className={`badge st-${m.status}`}>{m.status}</span>
              </div>
              <p className="muted">{m.agent} · priorité {m.priority}{m.to ? ` · vers ${m.to}` : ""}</p>
              <div className="bar"><span style={{ width: `${m.progress}%` }} /></div>
              {m.result && <p>{m.result}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Products() {
  const products = useSim((s) => s.snap.products);
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">Research</p><h2>Labo produits</h2></div></header>
      {products.length === 0 ? <p className="empty">Aucun produit analysé.</p> : (
        <div className="card-grid">
          {products.map((p) => (
            <article key={p.id} className="card">
              <h3>{p.name}</h3>
              <p className="muted">{p.niche} · score {p.score}/100</p>
              <p>{eur(p.price)} · coût {eur(p.cost)} · marge {p.margin.toFixed(0)}%</p>
              <label>Demande<div className="bar"><span style={{ width: `${p.demand}%` }} /></div></label>
              <label>Concurrence<div className="bar warn"><span style={{ width: `${p.competition}%` }} /></div></label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Studio() {
  const creatives = useSim((s) => s.snap.creatives);
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">Creative</p><h2>Studio</h2></div></header>
      {creatives.length === 0 ? <p className="empty">Aucun concept. Research doit d'abord transmettre un produit.</p> : (
        <div className="card-grid">
          {creatives.map((c) => (
            <article key={c.id} className="card">
              <h3>{c.product}</h3>
              <p>« {c.hook} »</p>
              <p className="muted">{c.style} · {c.angle} · score {c.score}</p>
              <p>{c.script}</p>
              <span className="badge">{c.status}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Campaigns() {
  const campaigns = useSim((s) => s.snap.campaigns);
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">Media</p><h2>Campagnes virtuelles</h2></div></header>
      {campaigns.length === 0 ? <p className="empty">Aucune campagne. Aucune dépense réelle n'est possible.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th><th>Plateforme</th><th>Statut</th><th>Spend</th><th>Budget</th><th>ROAS</th><th>CPA</th><th>Conv.</th><th>CA</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.product}</td>
                  <td>{c.platform}</td>
                  <td>{c.scaled && c.status === "SCALED" ? "SCALED" : c.status}</td>
                  <td>{eur(c.spent)}</td>
                  <td>{eur(c.budget)}</td>
                  <td className={c.roas >= 2 ? "gain" : c.roas > 0 && c.roas < 1.2 ? "loss" : ""}>{c.roas.toFixed(2)}x</td>
                  <td>{eur(c.cpa)}</td>
                  <td>{c.conversions}</td>
                  <td>{eur(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Analytics() {
  const snap = useSim((s) => s.snap);
  const byAgent = snap.agents.map((a) => ({
    name: a.name,
    done: a.completed,
    errors: a.errors.length,
  }));
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">Lecture</p><h2>Analytique</h2></div></header>
      <div className="stat-grid">
        <Big label="ROAS" value={snap.roas} format="x" />
        <Big label="CPA" value={snap.cpa} />
        <Big label="Panier moyen" value={snap.aov} />
        <Big label="Impressions" value={snap.campaigns.reduce((s, c) => s + c.impressions, 0)} format="num" />
      </div>
      <ul className="feed">
        {byAgent.map((a) => (
          <li key={a.name}><b>{a.name}</b> · {a.done} missions closes · {a.errors} erreurs</li>
        ))}
      </ul>
      <FinanceCharts />
    </div>
  );
}

function Finances() {
  const snap = useSim((s) => s.snap);
  const setCapital = useSim((s) => s.setCapital);
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">Grand livre virtuel</p>
          <h2>Finances</h2>
        </div>
      </header>
      <div className="stat-grid">
        <Big label="Capital" value={snap.capital} />
        <Big label="Capital de départ" value={snap.startingCapital} />
        <Big label="CA" value={snap.revenue} />
        <Big label="Bénéfice net" value={snap.netProfit} />
        <Big label="Pertes réalisées" value={snap.losses} />
        <Big label="Dépenses pub" value={snap.adSpend} />
        <Big label="Coût produit" value={snap.productCosts} />
        <Big label="Frais" value={snap.fees} />
        <Big label="Remboursements" value={snap.refunds} />
        <Big label="Commandes" value={snap.orders} format="num" />
      </div>
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setCapital(Number(data.get("capital")));
        }}
      >
        <label>
          Nouveau capital de départ
          <input name="capital" type="number" min={100} step={100} defaultValue={snap.startingCapital} />
        </label>
        <button type="submit">Appliquer</button>
        <p className="muted">Possible seulement à l'arrêt. Remet les compteurs à zéro, pas les réglages.</p>
      </form>
      <FinanceCharts />
    </div>
  );
}

function Log() {
  const log = useSim((s) => s.snap.log);
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">Trace</p><h2>Journal</h2></div></header>
      <ul className="feed mono">
        {log.map((entry) => (
          <li key={entry.id}><time>{clock(entry.at)}</time> {entry.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function Approvals() {
  const approvals = useSim((s) => s.snap.approvals);
  const approve = useSim((s) => s.approve);
  return (
    <div className="stack">
      <header className="block-head"><div><p className="kicker">YOU</p><h2>Centre de validation</h2></div></header>
      {approvals.length === 0 ? <p className="empty">Aucune décision en attente.</p> : (
        <ul className="feed">
          {approvals.map((a) => (
            <li key={a.id} className="approval">
              <p>{a.message}</p>
              <div className="row-btns">
                <button type="button" className="go" onClick={() => approve(a.id, true)}>Approuver</button>
                <button type="button" className="stop" onClick={() => approve(a.id, false)}>Refuser</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsPanel() {
  const settings = useSim((s) => s.settings);
  const update = useSim((s) => s.updateSettings);
  const exp = useSim((s) => s.exportJson);
  const imp = useSim((s) => s.importJson);
  const notice = useSim((s) => s.ui.notice);
  const clear = useSim((s) => s.clearNotice);
  return (
    <div className="stack">
      <header className="block-head">
        <div>
          <p className="kicker">Local</p>
          <h2>Réglages</h2>
        </div>
      </header>
      <div className="card form">
        <Slider label="Produits par cycle" min={1} max={12} step={1} value={settings.productBatch} onChange={(v) => update({ productBatch: v })} />
        <Slider label="Campagnes simultanées" min={1} max={8} step={1} value={settings.maxLiveCampaigns} onChange={(v) => update({ maxLiveCampaigns: v })} />
        <Slider label="Budget virtuel / campagne (€)" min={30} max={400} step={10} value={settings.budgetPerCampaign} onChange={(v) => update({ budgetPerCampaign: v })} />
        <Slider label="Durée d'une campagne (cycles)" min={6} max={24} step={1} value={settings.campaignBeats} onChange={(v) => update({ campaignBeats: v })} />
        <Slider label="Vitesse" min={0.5} max={2.5} step={0.1} value={settings.simSpeed} onChange={(v) => update({ simSpeed: v })} />
        <Slider label="Niveau de risque" min={0.1} max={0.8} step={0.05} value={settings.risk} onChange={(v) => update({ risk: v })} />
        <Slider label="Objectif ROAS" min={1.3} max={4} step={0.1} value={settings.targetRoas} onChange={(v) => update({ targetRoas: v })} />
        <Slider label="Seuil de validation budget (€)" min={40} max={400} step={10} value={settings.autoApproveBudget} onChange={(v) => update({ autoApproveBudget: v })} />
        <Slider label="Intensité lumineuse" min={0.2} max={1} step={0.05} value={settings.glow} onChange={(v) => update({ glow: v })} />
        <Slider label="Vitesse d'animation" min={0.6} max={1.8} step={0.1} value={settings.animSpeed} onChange={(v) => update({ animSpeed: v })} />
        <Slider label="Densité des particules" min={0} max={1} step={0.05} value={settings.particles} onChange={(v) => update({ particles: v })} />
        <label className="check"><input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} /> Sons</label>
        <label className="check"><input type="checkbox" checked={settings.performanceMode} onChange={(e) => update({ performanceMode: e.target.checked })} /> Mode performance</label>
        <label className="check"><input type="checkbox" checked={settings.showFloor} onChange={(e) => update({ showFloor: e.target.checked })} /> Sol de la salle</label>
        <div className="row-btns">
          {(["midnight", "void", "aurora"] as const).map((theme) => (
            <button key={theme} type="button" className={settings.theme === theme ? "on" : ""} onClick={() => update({ theme })}>{theme}</button>
          ))}
        </div>
        <div className="colors">
          {(Object.keys(settings.robotColors) as AgentId[]).map((id) => (
            <label key={id}>
              {id}
              <input
                type="color"
                value={settings.robotColors[id]}
                onChange={(e) => update({ robotColors: { ...settings.robotColors, [id]: e.target.value } })}
              />
            </label>
          ))}
        </div>
        <div className="row-btns">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([exp()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "command-center.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exporter
          </button>
          <label className="file">
            Importer
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                imp(await file.text());
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {notice && (
          <p className="notice">
            {notice} <button type="button" onClick={clear}>OK</button>
          </p>
        )}
        <p className="muted">Sauvegarde automatique dans ce navigateur. Aucune API payante. Aucune publicité réelle.</p>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <strong>{Number.isInteger(step) ? value : value.toFixed(2)}</strong>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function AgentDrawer() {
  const id = useSim((s) => s.ui.selected);
  const close = useSim((s) => s.selectAgent);
  const agents = useSim((s) => s.snap.agents);
  const missions = useSim((s) => s.snap.missions);
  const messages = useSim((s) => s.snap.messages);
  if (!id) return null;
  const agent = agents.find((a) => a.id === id);
  if (!agent) return null;
  const mine = missions.filter((m) => m.agent === id).slice(0, 6);
  const talk = messages.filter((m) => m.from === id || m.to === id).slice(0, 6);
  return (
    <div className="drawer-root">
      <button type="button" className="backdrop" aria-label="Fermer" onClick={() => close(null)} />
      <aside className="drawer" role="dialog" aria-label={agent.name}>
        <button type="button" className="close" onClick={() => close(null)}>Fermer</button>
        <RobotSprite id={agent.id} expression={agent.expression} status={agent.status} color={agent.color} />
        <h2>{agent.name}</h2>
        <p>{agent.role}</p>
        <p className="muted">{agent.blurb}</p>
        <span className={`badge st-${agent.status}`}>{agent.status}</span>
        <p>{agent.missionTitle ?? "Aucune mission en cours"}</p>
        <div className="bar"><span style={{ width: `${agent.progress}%` }} /></div>
        <p>{agent.completed} missions terminées</p>
        <Controls id={agent.id} />
        <h3>Missions</h3>
        {mine.length === 0 ? <p className="muted">Rien pour l'instant.</p> : mine.map((m) => <p key={m.id}>{m.title} · {m.status}</p>)}
        <h3>Messages</h3>
        {talk.length === 0 ? <p className="muted">Silence radio.</p> : talk.map((m) => <p key={m.id}>{m.text}</p>)}
        <h3>Erreurs</h3>
        {agent.errors.length === 0 ? <p className="muted">Aucune.</p> : agent.errors.map((e) => <p key={e} className="loss">{e}</p>)}
      </aside>
    </div>
  );
}
