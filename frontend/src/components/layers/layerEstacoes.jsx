import { useState } from "react";
import MarcadoresRotulados from "./marcadoresRotulados";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const STATIONS = [
  { id: 1, nome: "FURG - CCMAR", latitude: -32.02738, longitude: -52.10208 },
  { id: 2, nome: "São Lourenço do Sul", latitude: -31.36905, longitude: -51.96128 },
  { id: 3, nome: "Arambaré", latitude: -30.90649, longitude: -51.49224 },
  { id: 4, nome: "São José do Norte", latitude: -32.01310, longitude: -52.04398 },
  { id: 5, nome: "Itapuã", latitude: -30.38512, longitude: -51.05926 },
  { id: 6, nome: "Tavares", latitude: -31.28002, longitude: -51.15804 },
  { id: 7, nome: "Pelotas", latitude: -31.764725, longitude: -52.226296},
  { id: 8, nome: "Mostardas", latitude: -31.020614, longitude: -50.967112},
  // { id: 9, nome: "Colônia Z3", latitude: -31.702306, longitude: -52.156611},
  { id: 10, nome: "Viamão (Reserva Estadual)", latitude: -30.358806, longitude: -51.046306},
  { id: 11, nome: "Viamão (Itapuã)", latitude: -30.282613, longitude: -51.021316},
  { id: 12, nome: "Saco da Mangueira", latitude: -32.050917, longitude: -52.109917},
];

const DEFESA_CIVIL_IDS = [8, 9, 10, 11];

const isDefesaCivil = (stationId) =>
  DEFESA_CIVIL_IDS.includes(stationId);

/** Marcadores das estações de nível; o clique abre o gráfico. */
export function MarcadoresEstacoes({ selecionados, onSelecionar }) {
  return (
    <MarcadoresRotulados
      pontos={STATIONS}
      selecionados={selecionados}
      onSelecionar={onSelecionar}
      corPonto={(station) => (isDefesaCivil(station.id) ? "#F9A825" : "#2A3D59")}
      corTexto={(station) => (isDefesaCivil(station.id) ? "#9A6700" : "#2A3D59")}
    />
  );
}

/** Lista de estações (atalho para o gráfico) e legenda dos pontos. */
export function PainelEstacoes({ selecionados = [], onSelecionar }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [estacoesAbertas, setEstacoesAbertas] = useState(!isMobile);
  const selecionarEstacao = (station, moverMapa) => onSelecionar(station, moverMapa);

  return (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? "8px" : "10px",

      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#2A3D59",
    }}
  >
    {/* ===================================================== */}
    {/* LISTA DE ESTAÇÕES */}
    {/* ===================================================== */}

    <div
      style={{
        width: "100%",
        boxSizing: "border-box",

        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        padding: isMobile ? "8px" : "12px",
        borderRadius: "12px",
        boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
      }}
    >
      {/* Título / botão de abrir-fechar */}
      <button
        type="button"
        aria-expanded={estacoesAbertas}
        onClick={() => setEstacoesAbertas((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "700",
            color: "#2A3D59",
          }}
        >
          ESTAÇÕES
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: estacoesAbertas ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="#2A3D59"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Botões */}
      {estacoesAbertas && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "3px" : "5px",
            marginTop: isMobile ? "6px" : "10px",
          }}
        >
          {[...STATIONS]
            .sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR", {
                sensitivity: "base",
              })
            )
            .map((station) => {
              const defesaCivil = isDefesaCivil(station.id);

              const selecionada = selecionados.includes(station.id);

              const stationColor = defesaCivil ? "#F9A825" : "#2A3D59";

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selecionarEstacao(station, true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",

                    background: selecionada
                      ? "rgba(42, 61, 89, 0.10)"
                      : "rgba(255,255,255,0.55)",

                    border: selecionada
                      ? `1px solid ${stationColor}`
                      : "1px solid rgba(42,61,89,0.08)",

                    borderRadius: "7px",

                    padding: isMobile ? "5px 6px" : "7px 8px",

                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: isMobile ? "9px" : "12px",
                      fontWeight: selecionada ? "700" : "600",
                      color: stationColor,

                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {station.nome}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>

    {/* ===================================================== */}
    {/* LEGENDA DOS PONTOS */}
    {/* ===================================================== */}

    <div
      style={{
        width: "100%",
        boxSizing: "border-box",

        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        padding: isMobile ? "8px" : "12px",
        borderRadius: "12px",
        boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
      }}
    >
      {/* Título */}
      <div
        style={{
          fontSize: isMobile ? "10px" : "12px",
          fontWeight: "700",
          marginBottom: isMobile ? "7px" : "10px",
          color: "#2A3D59",
        }}
      >
        LEGENDA
      </div>

      {/* Rede de Monitoramento */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "7px" : "9px",
          marginBottom: isMobile ? "6px" : "8px",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#2A3D59",
            border: "3px solid white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "600",
            color: "#2A3D59",
          }}
        >
          Rede de Monitoramento
        </span>
      </div>

      {/* Defesa Civil */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "7px" : "9px",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#F9A825",
            border: "3px solid white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "600",
            color: "#2A3D59",
          }}
        >
          Defesa Civil
        </span>
      </div>
    </div>
  </div>
  );
}
