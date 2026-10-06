import TsunamiIcon from "@mui/icons-material/Tsunami";
import AirIcon from "@mui/icons-material/Air";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useState, useEffect, useMemo } from "react";
import { Source, Layer, useMap } from "react-map-gl/mapbox";

/* ==================== CONSTANTES ==================== */

const AZUL = "#2A3D59";
const CINZA_TEXTO = "#718096";
const CINZA_CLARO = "#CBD5E0";

// Mantém as fontes sempre montadas (ordem das camadas estável no Mapbox)
const VAZIO = { type: "FeatureCollection", features: [] };

const LEGENDAS = {
  corrente: {
    titulo: "Corrente (m/s)",
    gradiente:
      "linear-gradient(to right, #2D1E5F, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
    rotulos: ["0", "0.3", "0.5", "0.7", "1", "1.3", "1.5", "1.7", "2"]
  },
  vento: {
    titulo: "Vento (m/s)",
    gradiente:
      "linear-gradient(to right, #440154, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
    rotulos: ["0", "5", "10", "15", "20", "25", "30"]
  }
};

// Corrente: velocidade multiplicada por 100 no carregamento (escala 0–200)
const CORES_CORRENTE = [
  "interpolate",
  ["linear"],
  ["get", "velocidade"],
  0, "#2D1E5F",   // 0.0 m/s
  30, "#3B0F70",  // 0.3 m/s
  50, "#2C3E8C",  // 0.5 m/s
  70, "#1F5AA6",  // 0.7 m/s
  100, "#1177B3", // 1.0 m/s
  130, "#1F9E89", // 1.3 m/s
  150, "#35B779", // 1.5 m/s
  170, "#FDE725", // 1.7 m/s
  200, "#DC2F02"  // 2.0 m/s
];

const CORES_VENTO = [
  "interpolate",
  ["linear"],
  ["get", "velocidade"],
  0.0, "#440154",
  5.0, "#2C3E8C",
  10.0, "#1177B3",
  15.0, "#35B779",
  20.0, "#FDE725",
  25.0, "#F8961E",
  30.0, "#DC2F02"
];

// Setas de corrente e vento podem aparecer juntas, então têm cores distintas e sem contorno.
// As duas cores ficam fora das escalas de cor das camadas de velocidade.
const COR_SETA_VENTO = "#FFFFFF";
const COR_SETA_CORRENTE = "#35B779"; // rosa/magenta vivo

const ESTILO_SETAS = {
  corrente: { "text-color": COR_SETA_CORRENTE, "text-opacity": 1 },
  vento: { "text-color": COR_SETA_VENTO, "text-opacity": 1 }
};

// Aumenta o comprimento das setas (1 = tamanho anterior)
const ESCALA_SETAS = 2;

const TAMANHO_SETAS = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...[[3, 10], [5, 14], [7, 18], [10, 24], [15, 48]].flatMap(([zoom, tamanho]) => [
    zoom,
    Math.round(tamanho * ESCALA_SETAS)
  ])
];

/* ==================== FUNÇÕES AUXILIARES ==================== */

// Mesma tabela de TAMANHO_SETAS, em JS, para calcular o espaçamento da grade
const PONTOS_TAMANHO = [[3, 10], [5, 14], [7, 18], [10, 24], [15, 48]];
const FATOR_ESPACAMENTO = 1.3; // aumente para menos setas, diminua para mais

function tamanhoSetaPx(zoom) {
  const pts = PONTOS_TAMANHO.map(([z, t]) => [z, t * ESCALA_SETAS]);
  if (zoom <= pts[0][0]) return pts[0][1];
  if (zoom >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [z0, t0] = pts[i];
    const [z1, t1] = pts[i + 1];
    if (zoom >= z0 && zoom <= z1) return t0 + ((zoom - z0) / (z1 - z0)) * (t1 - t0);
  }
  return pts[0][1];
}

// Ponto representativo da feature (Point, ou centro do bbox para outras geometrias)
function coordenadaRepresentativa(geometry) {
  const c = geometry?.coordinates;
  if (!c) return null;
  if (typeof c[0] === "number") return c;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const percorrer = (a) => {
    if (typeof a[0] === "number") {
      minX = Math.min(minX, a[0]);
      maxX = Math.max(maxX, a[0]);
      minY = Math.min(minY, a[1]);
      maxY = Math.max(maxY, a[1]);
    } else {
      a.forEach(percorrer);
    }
  };
  percorrer(c);
  return Number.isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

// Mantém uma seta por célula; a célula é medida em pixels da tela (projeção Mercator do Mapbox)
function afinarPorZoom(geojson, zoom) {
  if (!geojson?.features?.length) return geojson;

  const mundo = 512 * Math.pow(2, zoom);
  const celula = tamanhoSetaPx(zoom) * FATOR_ESPACAMENTO;

  const ocupadas = new Set();
  const features = geojson.features.filter((f) => {
    const c = coordenadaRepresentativa(f.geometry);
    if (!c) return true;

    const x = ((c[0] + 180) / 360) * mundo;
    const s = Math.min(Math.max(Math.sin((c[1] * Math.PI) / 180), -0.9999), 0.9999);
    const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * mundo;

    const chave = `${Math.floor(x / celula)}_${Math.floor(y / celula)}`;
    if (ocupadas.has(chave)) return false;
    ocupadas.add(chave);
    return true;
  });

  return { ...geojson, features };
}

function useZoomDoMapa() {
  const { current: mapa } = useMap();
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    if (!mapa) return;
    const m = mapa.getMap();
    const atualizar = () => setZoom(Math.round(m.getZoom() * 4) / 4); // passos de 0,25
    atualizar();
    m.on("zoomend", atualizar);
    return () => m.off("zoomend", atualizar);
  }, [mapa]);

  return zoom;
}

const pad = (n) => String(n).padStart(2, "0");

const formatarData = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

function extrairDataHora(json) {
  const date = json?.date || json?.features?.[0]?.properties?.date;
  const hour = json?.hour || json?.features?.[0]?.properties?.hour;
  if (!date || !hour) return null;
  const [ano, mes, dia] = date.split("-");
  return `${dia}/${mes}/${ano} ${hour.substring(0, 5)}`;
}

function caminhoDados(fonteDados, prefixo, tipo, timestep) {
  const base = fonteDados === "cenario1" ? `/data/maio_2024_${prefixo}` : `/data/${prefixo}`;
  return `${base}_${tipo}_timestep_${timestep}.geojson`;
}

/**
 * Carrega velocidade e/ou direção de uma fonte (corrente ou vento).
 * Só busca o que está ativo; o que estiver desativado é descartado da memória.
 */
function useCampoTemporal({
  prefixo,
  fonteDados,
  timeStep,
  queroVelocidade,
  queroDirecao,
  escalaVelocidade = 1
}) {
  const [velocidade, setVelocidade] = useState(null);
  const [direcao, setDirecao] = useState(null);
  const [dataHora, setDataHora] = useState(null);

  useEffect(() => {
    if (!queroVelocidade) setVelocidade(null);
    if (!queroDirecao) setDirecao(null);

    if ((!queroVelocidade && !queroDirecao) || !fonteDados || timeStep == null) {
      setDataHora(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const timestep = String(timeStep).padStart(3, "0");

    const buscar = async (url) => {
      const resp = await fetch(url, { signal });
      if (!resp.ok) throw new Error(`Arquivo ${url} não encontrado.`);
      return resp.json();
    };

    const carregar = async () => {
      try {
        const [velJson, dirJson] = await Promise.all([
          queroVelocidade
            ? buscar(caminhoDados(fonteDados, prefixo, "velocidade", timestep))
            : null,
          queroDirecao
            ? buscar(caminhoDados(fonteDados, prefixo, "direcao", timestep))
            : null
        ]);

        if (velJson) {
          setVelocidade(
            escalaVelocidade === 1
              ? velJson
              : {
                  ...velJson,
                  features: velJson.features.map((f) => ({
                    ...f,
                    properties: {
                      ...f.properties,
                      velocidade: f.properties.velocidade * escalaVelocidade
                    }
                  }))
                }
          );
        }
        if (dirJson) setDirecao(dirJson);

        setDataHora(extrairDataHora(velJson) || extrairDataHora(dirJson));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(`Erro ao carregar dados de ${prefixo}:`, error.message);
        }
      }
    };

    carregar();
    return () => controller.abort();
  }, [prefixo, fonteDados, timeStep, queroVelocidade, queroDirecao, escalaVelocidade]);

  return { velocidade, direcao, dataHora };
}

/* ==================== COMPONENTES DO PAINEL ==================== */

function IconeSeta({ cor, tamanho = 12 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 12 12" fill="none">
      <path
        d="M6 10.5V2M6 2L2.75 5.25M6 2L9.25 5.25"
        stroke={cor}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AmostraSeta({ tipo }) {
  const ehCorrente = tipo === "corrente";
  return (
    <span
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // fundo escuro apenas para a seta branca do vento ficar visível
        background: AZUL
      }}
    >
      <IconeSeta cor={ehCorrente ? COR_SETA_CORRENTE : COR_SETA_VENTO} tamanho={12} />
    </span>
  );
}

function AmostraGradiente({ gradiente }) {
  return (
    <span
      style={{
        width: "24px",
        height: "8px",
        borderRadius: "4px",
        background: gradiente
      }}
    />
  );
}

function LinhaCamada({ ativo, onToggle, rotulo, amostra, isMobile }) {
  const altura = isMobile ? 15 : 17;
  const largura = isMobile ? 27 : 31;
  const bolinha = altura - 4;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: isMobile ? "5px 2px" : "6px 2px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left"
      }}
    >
      <span
        style={{
          width: "26px",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
          color: ativo ? AZUL : CINZA_TEXTO,
          transition: "color 0.2s"
        }}
      >
        {amostra}
      </span>

      <span
        style={{
          flex: 1,
          fontSize: isMobile ? "9px" : "12px",
          fontWeight: "600",
          color: ativo ? AZUL : CINZA_TEXTO,
          transition: "color 0.2s"
        }}
      >
        {rotulo}
      </span>

      <span
        style={{
          position: "relative",
          width: `${largura}px`,
          height: `${altura}px`,
          borderRadius: "999px",
          background: ativo ? AZUL : CINZA_CLARO,
          transition: "background 0.2s",
          flexShrink: 0
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: "2px",
            width: `${bolinha}px`,
            height: `${bolinha}px`,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(42,61,89,0.3)",
            transform: `translateX(${ativo ? largura - altura : 0}px)`,
            transition: "transform 0.2s"
          }}
        />
      </span>
    </button>
  );
}

function CabecalhoGrupo({ titulo, isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        marginBottom: "2px"
      }}
    >
      <span
        style={{
          fontSize: isMobile ? "9px" : "11px",
          fontWeight: "700",
          color: CINZA_TEXTO
        }}
      >
        {titulo}
      </span>
    </div>
  );
}

/* ==================== COMPONENTE PRINCIPAL ==================== */

export default function LayerAcopladoCV({
  timeStep,
  setTimeStep,
  dataFormatada,
  setDataFormatada,
  fonteDados
}) {
  // Camada de velocidade: "corrente" | "vento" | null (mutuamente exclusivas)
  const [velocidadeAtiva, setVelocidadeAtiva] = useState("corrente");
  // Vetores de direção: independentes, podem se sobrepor
  const [direcaoCorrente, setDirecaoCorrente] = useState(true);
  const [direcaoVento, setDirecaoVento] = useState(false);

  // null = usa o padrão (aberto no desktop, recolhido no mobile)
  const [painelAberto, setPainelAberto] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [dataBaseTimeline, setDataBaseTimeline] = useState(null);

  const isCenario = fonteDados === "cenario1";

  const maxTimeStep = isCenario
    ? 30 * 24   // 30 dias = 720 horas
    : 72;

  const tickInterval = isCenario
    ? 10 * 24   // marcador a cada 10 dias
    : 24;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const aberto = painelAberto ?? !isMobile;

  const ticks = [];
  for (let i = 0; i <= maxTimeStep; i += tickInterval) {
    ticks.push(i);
  }
  if (ticks[ticks.length - 1] !== maxTimeStep) {
    ticks.push(maxTimeStep);
  }

  const velocidadeCorrenteOn = velocidadeAtiva === "corrente";
  const velocidadeVentoOn = velocidadeAtiva === "vento";

  // Clicar na camada ativa desliga; clicar na outra troca (a anterior é desativada)
  const alternarVelocidade = (camada) =>
    setVelocidadeAtiva((atual) => (atual === camada ? null : camada));

  // Dados carregados apenas para o que está ativo
  const corrente = useCampoTemporal({
    prefixo: "corrente",
    fonteDados,
    timeStep,
    queroVelocidade: velocidadeCorrenteOn,
    queroDirecao: direcaoCorrente,
    escalaVelocidade: 100
  });

  const vento = useCampoTemporal({
    prefixo: "vento",
    fonteDados,
    timeStep,
    queroVelocidade: velocidadeVentoOn,
    queroDirecao: direcaoVento
  });

  // Com as duas direções ativas, a densidade é controlada pelo zoom nos dados
  const ambasDirecoes = direcaoCorrente && direcaoVento;
  const zoomMapa = useZoomDoMapa();

  const direcaoCorrenteDados = useMemo(
    () => (ambasDirecoes ? afinarPorZoom(corrente.direcao, zoomMapa) : corrente.direcao),
    [ambasDirecoes, corrente.direcao, zoomMapa]
  );
  const direcaoVentoDados = useMemo(
    () => (ambasDirecoes ? afinarPorZoom(vento.direcao, zoomMapa) : vento.direcao),
    [ambasDirecoes, vento.direcao, zoomMapa]
  );

  // Sem colisão entre as camadas quando as duas estão ativas
  const semColisao = ambasDirecoes
    ? { "text-allow-overlap": true, "text-ignore-placement": true }
    : {};

  // Effect do Timer (Play/Pause)
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep((prevStep) => {
          if (prevStep >= maxTimeStep) return 0;
          return prevStep + 1;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep, maxTimeStep]);

  // Data base da timeline (timestep_000 da fonte em uso)
  const fonteBase =
    velocidadeAtiva ?? (direcaoVento && !direcaoCorrente ? "vento" : "corrente");

  useEffect(() => {
    if (!fonteDados) return;

    const carregarDataBase = async () => {
      try {
        const response = await fetch(
          caminhoDados(fonteDados, fonteBase, "velocidade", "000")
        );

        if (!response.ok) {
          throw new Error(`Arquivo timestep_000.geojson de ${fonteBase} não encontrado.`);
        }

        const data = await response.json();
        const date = data.date || data.features?.[0]?.properties?.date;
        const hour = data.hour || data.features?.[0]?.properties?.hour;

        if (date && hour) {
          setDataBaseTimeline(new Date(`${date}T${hour}`));
        }
      } catch (error) {
        console.error("Erro ao iniciar timeline:", error.message);
      }
    };

    carregarDataBase();
  }, [fonteDados, fonteBase]);

  // Data/hora exibida na timeline: vem do arquivo carregado; se não houver
  // nenhuma camada ativa, é calculada a partir da data base + timeStep
  const dataDoArquivo =
    ((velocidadeCorrenteOn || direcaoCorrente) && corrente.dataHora) ||
    ((velocidadeVentoOn || direcaoVento) && vento.dataHora) ||
    null;

  useEffect(() => {
    if (dataDoArquivo) {
      setDataFormatada(dataDoArquivo);
      return;
    }
    if (!dataBaseTimeline || timeStep == null) return;
    const d = new Date(dataBaseTimeline.getTime() + timeStep * 60 * 60 * 1000);
    setDataFormatada(formatarData(d));
  }, [dataDoArquivo, dataBaseTimeline, timeStep, setDataFormatada]);

  const legenda = velocidadeAtiva ? LEGENDAS[velocidadeAtiva] : null;

  const visibilidade = (ativo) => (ativo ? "visible" : "none");

  const layoutSetas = (ativo, extra = {}) => ({
    visibility: visibilidade(ativo),
    "text-field": "↑",
    "symbol-spacing": 10,
    "text-size": TAMANHO_SETAS,
    "symbol-placement": "point",
    "text-rotate": ["get", "direcao"],
    "text-rotation-alignment": "map",
    "text-keep-upright": false,
    "text-anchor": "center",
    ...extra
  });

  return (
    <>
      {/* ==================== PAINEL DE CAMADAS + LEGENDA ==================== */}
      <div
        style={{
          position: "absolute",
          right: isMobile ? "10px" : "20px",
          top: isMobile ? "10px" : "20px",
          zIndex: 1000,

          width: isMobile ? "150px" : "210px",

          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "8px" : "10px",

          fontFamily: "system-ui, -apple-system, sans-serif",
          color: AZUL
        }}
      >
        {/* Painel de controle de camadas */}
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",

            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
            padding: isMobile ? "8px" : "12px",
            borderRadius: "12px",
            boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.4)"
          }}
        >
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setPainelAberto(!aberto)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            <span
              style={{
                fontSize: isMobile ? "10px" : "12px",
                fontWeight: "700",
                color: AZUL
              }}
            >
              Camadas
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s"
              }}
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke={AZUL}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {aberto && (
            <div style={{ marginTop: isMobile ? "6px" : "10px" }}>
              {/* Velocidade: uma por vez */}
              <CabecalhoGrupo titulo="Velocidade" isMobile={isMobile} />
              <LinhaCamada
                rotulo="Corrente"
                ativo={velocidadeCorrenteOn}
                onToggle={() => alternarVelocidade("corrente")}
                amostra={<TsunamiIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                isMobile={isMobile}
              />
              <LinhaCamada
                rotulo="Vento"
                ativo={velocidadeVentoOn}
                onToggle={() => alternarVelocidade("vento")}
                amostra={<AirIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                isMobile={isMobile}
              />

              <div
                style={{
                  height: "1px",
                  background: "rgba(42, 61, 89, 0.1)",
                  margin: isMobile ? "6px 0" : "8px 0"
                }}
              />

              {/* Direção: combináveis */}
              <CabecalhoGrupo titulo="Direção" isMobile={isMobile} />
              <LinhaCamada
                rotulo="Corrente"
                ativo={direcaoCorrente}
                onToggle={() => setDirecaoCorrente((v) => !v)}
                amostra={<AmostraSeta tipo="corrente" />}
                isMobile={isMobile}
              />
              <LinhaCamada
                rotulo="Vento"
                ativo={direcaoVento}
                onToggle={() => setDirecaoVento((v) => !v)}
                amostra={<AmostraSeta tipo="vento" />}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>

        {/* Legenda horizontal da velocidade ativa (mesmo padrão da camada de nível) */}
        {legenda && (
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",

              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",

              padding: isMobile ? "8px 10px" : "12px 14px",

              borderRadius: "12px",
              boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.4)"
            }}
          >
            {/* Título */}
            <div
              style={{
                fontSize: isMobile ? "10px" : "12px",
                fontWeight: "700",
                textAlign: "left",
                marginBottom: isMobile ? "6px" : "8px",
                color: AZUL
              }}
            >
              {legenda.titulo}
            </div>

            {/* Gradiente */}
            <div
              style={{
                width: "100%",
                height: isMobile ? "10px" : "14px",
                borderRadius: "4px",
                background: legenda.gradiente,
                border: "1px solid rgba(42, 61, 89, 0.15)",
                boxSizing: "border-box"
              }}
            />

            {/* Valores */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                marginTop: "5px",

                fontSize: isMobile ? "9px" : "11px",
                fontWeight: "600",
                color: AZUL
              }}
            >
              {legenda.rotulos.map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================== TIMELINE INTERATIVA ==================== */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? "28px" : "20px",
          // Centralização real na tela
          left: "50%",
          transform: "translateX(-50%)",

          // Limita a largura para manter espaço nas laterais
          width: isMobile ? "94%" : "min(68%, calc(100% - 520px))",

          minWidth: 0,

          zIndex: 1000,

          background: "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(8px)",

          padding: isMobile ? "8px 12px" : "10px 16px",

          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(42, 61, 89, 0.15)",
          border: "1px solid rgba(42, 61, 89, 0.1)",

          boxSizing: "border-box",
          fontFamily: "system-ui, -apple-system, sans-serif",

          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: isMobile ? "4px" : "6px"
        }}
      >
        {/* Informações superiores */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",

            paddingLeft: isMobile ? "36px" : "42px",

            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {/* Data e hora */}
          <span
            style={{
              fontSize: isMobile ? "11px" : "14px",
              fontWeight: "700",
              color: AZUL,
              whiteSpace: "nowrap"
            }}
          >
            {dataFormatada || "Carregando..."}
          </span>

          {/* Horas adicionais */}
          <span
            style={{
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: "600",

              background: "rgba(42, 61, 89, 0.1)",
              color: AZUL,

              padding: isMobile ? "2px 6px" : "3px 8px",
              borderRadius: "20px",

              whiteSpace: "nowrap"
            }}
          >
            + {timeStep}h
          </span>
        </div>

        {/* Linha principal */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            width: "100%",
            gap: isMobile ? "10px" : "12px"
          }}
        >
          {/* Play / Pause */}
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: AZUL,
                border: "none",
                borderRadius: "50%",

                width: isMobile ? "30px" : "34px",
                height: isMobile ? "30px" : "34px",
                minWidth: isMobile ? "30px" : "34px",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                cursor: "pointer",
                color: "white",

                padding: 0
              }}
            >
              {isPlaying ? (
                <svg
                  width={isMobile ? "9" : "11"}
                  height={isMobile ? "11" : "13"}
                  viewBox="0 0 10 12"
                  fill="none"
                >
                  <path
                    d="M2 1V11M8 1V11"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width={isMobile ? "11" : "13"}
                  height={isMobile ? "13" : "15"}
                  viewBox="0 0 12 14"
                  fill="none"
                  style={{ marginLeft: "2px" }}
                >
                  <path
                    d="M1.5 1.75V12.25L9.75 7L1.5 1.75Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Timeline */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Slider */}
            <div
              style={{
                height: isMobile ? "30px" : "34px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <input
                type="range"
                min={0}
                max={maxTimeStep}
                value={timeStep}
                step={1}
                onChange={(e) => setTimeStep(Number(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer",
                  accentColor: AZUL,
                  margin: 0,
                  padding: 0
                }}
              />
            </div>

            {/* Marcadores */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                marginTop: isMobile ? "2px" : "3px"
              }}
            >
              {ticks.map((tick) => {
                let textoMarcador = tick === 0 ? "Início" : `+${tick}h`;

                if (dataBaseTimeline) {
                  const dataMarcador = new Date(dataBaseTimeline);
                  dataMarcador.setHours(dataMarcador.getHours() + tick);

                  const dia = String(dataMarcador.getDate()).padStart(2, "0");
                  const mes = dataMarcador.toLocaleDateString("pt-BR", {
                    month: "short"
                  });

                  textoMarcador = `${dia} ${mes}`;
                }

                return (
                  <div
                    key={tick}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",

                      fontSize: isMobile ? "8px" : "10px",
                      fontWeight: "600",

                      color: timeStep >= tick ? AZUL : "#A0AEC0",

                      whiteSpace: "nowrap"
                    }}
                  >
                    <div
                      style={{
                        width: "2px",
                        height: isMobile ? "4px" : "5px",
                        background: timeStep >= tick ? AZUL : CINZA_CLARO,
                        marginBottom: "3px"
                      }}
                    />

                    {textoMarcador}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CAMADAS DO MAPA ====================
          Todas ficam montadas, na ordem: preenchimentos → setas.
          A visibilidade é controlada pelo painel, o que garante que as
          setas fiquem sempre por cima da velocidade. */}

      {/* Velocidade da corrente */}
      <Source id="corrente-velocidade" type="geojson" data={corrente.velocidade ?? VAZIO}>
        <Layer
          id="corrente-velocidade-fill"
          type="fill"
          layout={{ visibility: visibilidade(velocidadeCorrenteOn) }}
          paint={{
            "fill-color": CORES_CORRENTE,
            "fill-opacity": 0.9,
            "fill-antialias": false
          }}
        />
      </Source>

      {/* Velocidade do vento */}
      <Source id="vento-velocidade" type="geojson" data={vento.velocidade ?? VAZIO}>
        <Layer
          id="vento-velocidade-fill"
          type="fill"
          layout={{ visibility: visibilidade(velocidadeVentoOn) }}
          paint={{ "fill-color": CORES_VENTO }}
        />
      </Source>

      {/* Direção da corrente */}
      <Source id="corrente-direcao" type="geojson" data={direcaoCorrenteDados ?? VAZIO}>
        <Layer
          id="corrente-direcao-setas"
          type="symbol"
          layout={layoutSetas(direcaoCorrente, semColisao)}
          paint={ESTILO_SETAS.corrente}
        />
      </Source>

      {/* Direção do vento */}
      <Source id="vento-direcao" type="geojson" data={direcaoVentoDados ?? VAZIO}>
        <Layer
          id="vento-direcao-setas"
          type="symbol"
          layout={layoutSetas(direcaoVento, semColisao)}
          paint={ESTILO_SETAS.vento}
        />
      </Source>
    </>
  );
}
