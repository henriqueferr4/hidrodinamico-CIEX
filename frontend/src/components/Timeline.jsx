import { useState, useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const AZUL = "#2A3D59";
const CINZA_CLARO = "#CBD5E0";

/** Timeline compartilhada por todas as camadas temporais do mapa. */
export default function Timeline({
  timeStep,
  setTimeStep,
  maxTimeStep,
  tickInterval,
  dataFormatada,
  dataBaseTimeline
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const ticks = [];
  for (let i = 0; i <= maxTimeStep; i += tickInterval) {
    ticks.push(i);
  }
  if (ticks[ticks.length - 1] !== maxTimeStep) {
    ticks.push(maxTimeStep);
  }

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

  return (
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
            aria-label={isPlaying ? "Pausar animação" : "Reproduzir animação"}
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
  );
}
