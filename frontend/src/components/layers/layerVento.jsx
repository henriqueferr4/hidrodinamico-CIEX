import { useState, useEffect } from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

export default function LayerVento({
  timeStep,
  setTimeStep,
  dataFormatada,
  setDataFormatada,
  fonteDados
}) {
  const [geojsonVelocidade, setGeojsonVelocidade] = useState(null);
  const [geojsonDirecao, setGeojsonDirecao] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [dataBaseTimeline, setDataBaseTimeline] = useState(null);

  const maxTimeStep = fonteDados === "previsao" ? 72 : 701;
  const tickInterval = fonteDados === "previsao" ? 24 : 120;

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

  // Effect para carregar os dados temporais de VENTO
  useEffect(() => {
    if (!fonteDados || timeStep === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    const carregarGeoJSON = async () => {
      try {
        const timestep = String(timeStep).padStart(3, "0");

        const [respVelocidade, respDirecao] = await Promise.all([
          fetch(`/data/vento_velocidade_timestep_${timestep}.geojson`, { signal }),
          fetch(`/data/vento_direcao_timestep_${timestep}.geojson`, { signal })
        ]);

        if (!respVelocidade.ok || !respDirecao.ok) {
          throw new Error(`Arquivos de vento do timestep_${timestep} não encontrados.`);
        }

        const velocidadData = await respVelocidade.json();
        const direcaoData = await respDirecao.json();

        setGeojsonVelocidade(velocidadData);
        setGeojsonDirecao(direcaoData);

        const date = velocidadData.date || velocidadData.features?.[0]?.properties?.date;
        const hour = velocidadData.hour || velocidadData.features?.[0]?.properties?.hour;

        if (date && hour) {
          const [ano, mes, dia] = date.split("-");
          const horaFormatada = hour.substring(0, 5);
          setDataFormatada(`${dia}/${mes}/${ano} ${horaFormatada}`);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Erro na esteira de dados de vento:", error.message);
        }
      }
    };

    carregarGeoJSON();
    return () => controller.abort();
  }, [timeStep, fonteDados, setDataFormatada]);

  // Effect da Data Base para Vento
  useEffect(() => {
    if (!fonteDados) return;

    const carregarDataBase = async () => {
      try {
        const response = await fetch(`/data/vento_velocidade_timestep_000.geojson`);

        if (!response.ok) {
          throw new Error("Arquivo timestep_000.geojson de vento não encontrado.");
        }

        const data = await response.json();
        const date = data.date || data.features?.[0]?.properties?.date;
        const hour = data.hour || data.features?.[0]?.properties?.hour;

        if (date && hour) {
          setDataBaseTimeline(new Date(`${date}T${hour}`));
        }
      } catch (error) {
        console.error("Erro ao iniciar timeline de vento:", error.message);
      }
    };

    carregarDataBase();
  }, [fonteDados]);

  return (
    <>
      {/* LEGENDA (Escala original de vento: 0.0 a 30 m/s) */}
      <div
        style={{
          position: "absolute",
          right: isMobile ? "10px" : "20px",
          top: isMobile ? "10px" : "20px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.4)",
          padding: isMobile ? "8px 10px" : "12px 14px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(42,61,89,0.1)"
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: isMobile ? "6px" : "10px",
            color: "#2A3D59"
          }}
        >
          Velocidade <br /> do vento (m/s)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
          <div
            style={{
              width: isMobile ? "10px" : "14px",
              height: isMobile ? "180px" : "300px",
              borderRadius: "4px",
              background:
                "linear-gradient(to top, #440154, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)"
            }}
          />
          <div
            style={{
              height: isMobile ? "180px" : "300px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: isMobile ? "9px" : "11px",
              fontWeight: "600",
              color: "#2A3D59"
            }}
          >
            <span>30</span>
            <span>25</span>
            <span>20</span>
            <span>15</span>
            <span>10</span>
            <span>5</span>
            <span>0.0</span>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? "10px" : "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: isMobile ? "92%" : "65%",
          minWidth: isMobile ? "0" : "400px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          padding: isMobile ? "8px 12px" : "10px 18px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(42,61,89,0.15)",
          border: "1px solid rgba(42,61,89,0.1)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: "#2A3D59",
                border: "none",
                borderRadius: "50%",
                width: isMobile ? "26px" : "32px",
                height: isMobile ? "26px" : "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white"
              }}
            >
              {isPlaying ? (
                <svg width={isMobile ? "8" : "10"} height={isMobile ? "10" : "12"} viewBox="0 0 10 12" fill="none">
                  <path d="M2 1V11M8 1V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width={isMobile ? "10" : "12"} height={isMobile ? "12" : "14"} viewBox="0 0 12 14" fill="none" style={{ marginLeft: "2px" }}>
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
            <span style={{ fontSize: isMobile ? "12px" : "15px", fontWeight: "700", color: "#2A3D59" }}>
              {dataFormatada || "..."}
            </span>
          </div>
          <span
            style={{
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: "600",
              background: "rgba(42,61,89,0.1)",
              color: "#2A3D59",
              padding: isMobile ? "3px 8px" : "4px 10px",
              borderRadius: "20px"
            }}
          >
            + {timeStep}h
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxTimeStep}
          value={timeStep}
          step={1}
          onChange={(e) => setTimeStep(Number(e.target.value))}
          style={{ width: "100%", marginTop: isMobile ? "6px" : "10px", cursor: "pointer", accentColor: "#2A3D59" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: isMobile ? "4px" : "8px" }}>
          {ticks.map((tick) => {
            let textoMarcador = tick === 0 ? "Início" : `+${tick}h`;
            if (dataBaseTimeline) {
              const dataMarcador = new Date(dataBaseTimeline);
              dataMarcador.setHours(dataMarcador.getHours() + tick);
              const dia = String(dataMarcador.getDate()).padStart(2, "0");
              const mes = dataMarcador.toLocaleDateString("pt-BR", { month: "short" });
              textoMarcador = `${dia} ${mes}`;
            }
            return (
              <div
                key={tick}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: isMobile ? "9px" : "11px",
                  color: timeStep >= tick ? "#2A3D59" : "#A0AEC0"
                }}
              >
                <div style={{ width: "2px", height: "5px", background: timeStep >= tick ? "#2A3D59" : "#CBD5E0", marginBottom: "4px" }} />
                {textoMarcador}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== RENDERIZAÇÃO DAS CAMADAS OPERACIONAIS ==================== */}

      {/* 1. CAMADA DE VELOCIDADE (Fundo Contínuo / Colorido) */}
      {geojsonVelocidade && (
        <Source id="vento-velocidade" type="geojson" data={geojsonVelocidade}>
          <Layer
            id="vento-velocidade-fill"
            type="fill"
            paint={{
              "fill-color": [
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
              ]
            }}
          />
        </Source>
      )}

      {/* 2. CAMADA DE DIREÇÃO (Setas/Vetores desenhados por cima) */}
      {geojsonDirecao && (
        <Source id="vento-direcao" type="geojson" data={geojsonDirecao}>
          <Layer
            id="vento-direcao-setas"
            type="symbol"
            layout={{
              "text-field": "↑",
              "symbol-spacing": 10,
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                3, 10,
                5, 14,
                7, 18,
                10, 24,
                15, 48

              ],
              "symbol-placement": "point",
              "text-rotate": ["get", "direcao"],
              "text-rotation-alignment": "map",
              "text-keep-upright": false,
              "text-anchor": "center"
            }}
            paint={{
              "text-color": "#ffffff",
              "text-opacity": 0.95,
              "text-halo-width": 2
            }}
          />
        </Source>
      )}
    </>
  );
}