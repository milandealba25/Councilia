export const AGENT_IDS = ["marco", "elena", "rafael"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_LABELS: Record<AgentId, string> = {
  marco: "Marco",
  elena: "Elena",
  rafael: "Rafael",
};

export const AGENT_ROLES: Record<AgentId, string> = {
  marco: "Estratega",
  elena: "Analista de riesgo",
  rafael: "Crítico",
};

export const AGENT_DOMINANT_QUESTION: Record<AgentId, string> = {
  marco: "¿Qué versión de ti es la que esta decisión te empuja a ser en 2 años?",
  elena: "¿Cuál es el peor escenario realista y cuánto te cuesta si pasa?",
  rafael: "¿Qué estás dando por hecho que en realidad no has verificado?",
};
