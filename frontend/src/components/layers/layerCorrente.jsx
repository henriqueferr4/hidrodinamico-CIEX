import { useState, useEffect } from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

export default function LayerCorrente({
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

  // Effect para carregar os dados temporais
  useEffect(() => {
    if (!fonteDados || timeStep == null) return;

    const controller = new AbortController();
    const { signal } = controller;

    const carregarGeoJSON = async () => {
      try {
        const timestep = String(timeStep).padStart(3, "0");

        const [respVelocidade, respDirecao] = await Promise.all([
          fetch(`/data/corrente_velocidade_timestep_${timestep}.geojson`, { signal }),
          fetch(`/data/corrente_direcao_timestep_${timestep}.geojson`, { signal })
        ]);

        // Se o servidor retornar erro 404 (página html), joga para o catch e evita o crash do JSON
        if (!respVelocidade.ok || !respDirecao.ok) {
          throw new Error(`Arquivos do timestep_${timestep} não foram encontrados no servidor.`);
        }

        const velocidadeData = await respVelocidade.json();
        const direcaoData = await respDirecao.json();

        const velocidadeNormalizada = {
        ...velocidadeData,
        features: velocidadeData.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            velocidade: f.properties.velocidade * 100
          }
        }))
      };

      setGeojsonVelocidade(velocidadeNormalizada);

        const direcaoNormalizada = {
  ...direcaoData,
  features: direcaoData.features.map((f) => ({
    ...f,
    properties: {
      ...f.properties
    }
  }))
};

setGeojsonDirecao(direcaoNormalizada);

        const date = velocidadeData.date || velocidadeData.features?.[0]?.properties?.date;
        const hour = velocidadeData.hour || velocidadeData.features?.[0]?.properties?.hour;

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

  // 2. EFFECT DA DATA BASE DA TIMELINE
  useEffect(() => {
    if (!fonteDados) return;

    const carregarDataBase = async () => {
      try {
        const response = await fetch(`/data/corrente_velocidade_timestep_000.geojson`);

        if (!response.ok) {
          throw new Error("Arquivo timestep_000.geojson de velocidade de referência não encontrado.");
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
     {/* LEGENDA CORRENTE (0 a 50 escala visual) */}
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
        Velocidade da <br/>
        corrente (m/s)
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
        <div
          style={{
            width: isMobile ? "10px" : "14px",
            height: isMobile ? "180px" : "300px",
            borderRadius: "4px",
            background:
              "linear-gradient(to top, #2D1E5F, #3B0F70, #2C3E8C, #1F5AA6, #1177B3, #1F9E89, #35B779, #B4DE2C, #FDE725, #F8961E, #DC2F02)"
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
            <span>2.0</span>
            <span>1.7</span>
            <span>1.5</span>
            <span>1.3</span>
            <span>1</span>
            <span>0.7</span>
            <span>0.5</span>
            <span>0.3</span>
            <span>0</span>
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

      
{geojsonVelocidade && (
  <Source
    id="corrente-velocidade"
    type="geojson"
    data={geojsonVelocidade}
  >
    <Layer
      id="corrente-velocidade-fill"
      type="fill"
      paint={{
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "velocidade"],

                 0,   "#2D1E5F",  // 0.0 m/s
                30,  "#3B0F70",  // 0.3 m/s
                50,  "#2C3E8C",  // 0.5 m/s
                70,  "#1F5AA6",  // 0.7 m/s
                100, "#1177B3",  // 1.0 m/s
                130, "#1F9E89",  // 1.3 m/s
                150, "#35B779",  // 1.5 m/s
                170, "#FDE725",  // 1.7 m/s
                200, "#DC2F02"   // 2.0 m/s
        ],

        "fill-opacity": 0.9,
        "fill-antialias": false
      }}
    />
  </Source>
)}

      {/* 2. CAMADA DE DIREÇÃO (Setas/Vetores desenhados por cima) */}
    {geojsonDirecao && (
    <Source id="corrente-direcao" type="geojson" data={geojsonDirecao}>
        
       <Layer
            id="corrente-direcao-setas"
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