import type { AgentId, Expression, WorkStatus } from "@/lib/sim/types";

export function RobotSprite({
  id,
  expression,
  status,
  color,
}: {
  id: AgentId;
  expression: Expression;
  status: WorkStatus;
  color: string;
}) {
  const working = status === "WORKING" || status === "THINKING" || status === "COMMUNICATING";
  return (
    <svg
      className={`robot robot-${id} is-${expression} ${working ? "is-work" : ""}`}
      viewBox="0 0 140 188"
      role="img"
      aria-label={id}
      style={{ color }}
    >
      <ellipse className="shadow" cx="70" cy="176" rx="28" ry="6" />
      <g className="chassis">
        <g className="arm arm-l">
          <rect x="18" y="86" width="14" height="36" rx="6" className="plate" />
          <rect x="16" y="118" width="16" height="18" rx="5" className="plate dim" />
        </g>
        <g className="arm arm-r">
          <rect x="108" y="86" width="14" height="36" rx="6" className="plate" />
          <rect x="108" y="118" width="16" height="18" rx="5" className="plate dim" />
        </g>
        <path d="M46 150 h14 v22 h-10 q-6 0-8-8z" className="plate" />
        <path d="M80 150 h14 v14 q-2 8-8 8 h-10z" className="plate" />
        <rect x="44" y="78" width="52" height="74" rx="16" className="plate torso" />
        <circle cx="70" cy="112" r="10" className="core" />
        <path d="M58 128 h24" className="seam" />
        {id === "you" && <path d="M52 84 h36 l-4 14 h-28z" className="crest" />}
        {id === "optimization" && (
          <g className="orbits">
            <ellipse cx="70" cy="112" rx="18" ry="7" />
            <ellipse cx="70" cy="112" rx="7" ry="18" />
          </g>
        )}
        <g className="head">
          <rect x="40" y="28" width="60" height="48" rx="16" className="plate" />
          <rect x="48" y="40" width="44" height="20" rx="7" className="visor" />
          <circle cx="60" cy="50" r="3.2" className="eye" />
          <circle cx="80" cy="50" r="3.2" className="eye" />
          <path d="M66 14 h8 v14 h-8z" className="antenna" />
          <circle cx="70" cy="12" r="4" className="core" />
          {id === "research" && <rect x="102" y="34" width="22" height="16" rx="2" className="holo" />}
          {id === "creative" && (
            <g className="spark">
              <path d="M112 46 l6 4 -6 4 -2-4z" />
              <path d="M120 36 l4 7 -7 2z" />
            </g>
          )}
          {id === "media" && (
            <g className="bars">
              <rect x="104" y="52" width="4" height="10" />
              <rect x="110" y="46" width="4" height="16" />
              <rect x="116" y="40" width="4" height="22" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
