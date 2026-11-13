/** Future slot for a real model. The running app does not call one. */
export interface AgentBrain {
  readonly mode: "simulation" | "external";
  readonly label: string;
}

export const activeBrain: AgentBrain = {
  mode: "simulation",
  label: "Moteur local — règles déterministes, aucun appel réseau, aucun modèle externe",
};
