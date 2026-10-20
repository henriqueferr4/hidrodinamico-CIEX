/* ==================== CONFIGURAÇÃO DAS CAMADAS ====================
   Fonte única das camadas exibidas no painel de controle, nas legendas
   e no mapa. */

// Camadas base (preenchimento colorido): apenas uma ativa por vez
export const CAMADAS_BASE = [
  {
    id: "nivel",
    rotulo: "Nível",
    legenda: "Nível (cm)",
    gradiente:
      "linear-gradient(to right, #440154, #443983, #31688E, #21908C, #20A387, #35B779, #4EA53B, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
    rotulos: ["-50", "0", "50", "100", "150", "200"]
  },
  {
    id: "corrente",
    rotulo: "Corrente",
    legenda: "Velocidade da corrente (m/s)",
    gradiente:
      "linear-gradient(to right, #2D1E5F, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
    rotulos: ["0", "0.3", "0.5", "0.7", "1", "1.3", "1.5", "1.7", "2"]
  },
  {
    id: "vento",
    rotulo: "Vento",
    legenda: "Velocidade do vento (m/s)",
    gradiente:
      "linear-gradient(to right, #440154, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
    rotulos: ["0", "5", "10", "15", "20", "25", "30"]
  },
  {
    // Sem campo colorido: exibe apenas os pontos que abrem os gráficos de vazão
    id: "vazao",
    rotulo: "Vazão",
    temporal: false,
    somentePrevisao: true
  }
];

// Camadas base com campo colorido animado pela timeline
export const ehCampoTemporal = (id) =>
  Boolean(id) && CAMADAS_BASE.find((c) => c.id === id)?.temporal !== false;

// Setas de corrente e vento podem aparecer juntas, então têm cores distintas
export const COR_SETA = {
  // Cinza claro: fora das escalas de cores e distinguível do branco do vento
  corrente: "#A3A3A3",
  vento: "#FFFFFF"
};

// Fundo das amostras de seta (painel e escala): cinza-escuro, onde a seta
// cinza-clara da corrente e a branca do vento ficam visíveis
export const FUNDO_AMOSTRA_SETA = "#374151";

// Camadas de vetores (setas de direção): podem se sobrepor
export const CAMADAS_VETORES = [
  { id: "corrente", rotulo: "Corrente" },
  { id: "vento", rotulo: "Vento" }
];

// Cenários disponíveis. Para incluir um novo, basta adicionar uma entrada:
// `prefixo` é o início dos arquivos em /data (ex.: maio_2024_nivel_timestep_000.geojson)
export const CENARIOS = [
  { id: "cenario1", rotulo: "Maio de 2024", prefixo: "maio_2024", dias: 30 }
];

export const buscarCenario = (fonteDados) => CENARIOS.find((c) => c.id === fonteDados);

export const ehCenario = (fonteDados) => Boolean(buscarCenario(fonteDados));

// Horizonte da timeline: previsão de 72 h ou a duração do cenário
export const horizonteTimeline = (fonteDados) => {
  const cenario = buscarCenario(fonteDados);
  return cenario
    ? { maxTimeStep: cenario.dias * 24, tickInterval: 10 * 24 }
    : { maxTimeStep: 72, tickInterval: 24 };
};
