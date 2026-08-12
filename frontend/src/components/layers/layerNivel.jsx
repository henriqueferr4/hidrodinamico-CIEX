import { useState, useEffect } from "react";
import { Source, Layer, Marker } from "react-map-gl/mapbox";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const STATIONS = [
  { id: 1, nome: "FURG - CCMAR", latitude: -32.02738, longitude: -52.10208 },
  { id: 2, nome: "S. Lourenço do Sul", latitude: -31.36905, longitude: -51.96128 },
  { id: 3, nome: "Arambaré", latitude: -30.90649, longitude: -51.49224 },
  { id: 4, nome: "São José do Norte", latitude: -32.01310, longitude: -52.04398 },
  { id: 5, nome: "Itapuã", latitude: -30.38512, longitude: -51.05926 },
  { id: 6, nome: "Laranjal", latitude: -31.764725, longitude: -52.226296}
];

export default function LayerNivel({
  timeStep,
  setTimeStep,
  dataFormatada,
  setDataFormatada,
  estacaoSelecionada,
  setEstacaoSelecionada
}) {
  const [geojson, setGeojson] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dataBaseTimeline, setDataBaseTimeline] = useState(null);
  const [maxTimeStep, setMaxTimeStep] = useState(70); // ajuste se souber o valor exato

  const tickInterval = 24;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const ticks = [];
  for (let i = 0; i <= maxTimeStep; i += tickInterval) {
    ticks.push(i);
  }
  if (ticks[ticks.length - 1] !== maxTimeStep) {
    ticks.push(maxTimeStep);
  }

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep((prevStep) => (prevStep >= maxTimeStep ? 0 : prevStep + 1));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep, maxTimeStep]);

  useEffect(() => {
    if (timeStep === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    const timestepFormatado = String(timeStep).padStart(3, "0");
    const filename = `/data/nivel_timestep_${timestepFormatado}.geojson`;

    fetch(filename, { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Arquivo ${filename} não encontrado no servidor.`);
        }
        return response.json();
      })
      .then((data) => {
        setGeojson(data);
        const date = data.date || data.features?.[0]?.properties?.date;
        const hour = data.hour || data.features?.[0]?.properties?.hour;
        if (date && hour) {
          const [ano, mes, dia] = date.split("-");
          const horaFormatada = hour.substring(0, 5);
          setDataFormatada(`${dia}/${mes}/${ano} ${horaFormatada}`);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Erro ao carregar GeoJSON de nível:", error.message);
        }
      });

    return () => controller.abort();
  }, [timeStep, setDataFormatada]);

  useEffect(() => {
    fetch(`/data/nivel_timestep_000.geojson`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const date = data.date || data.features?.[0]?.properties?.date;
        const hour = data.hour || data.features?.[0]?.properties?.hour;
        if (date && hour) {
          setDataBaseTimeline(new Date(`${date}T${hour}`));
        }
      })
      .catch((err) => console.error("Erro ao iniciar timeline de nível:", err));
  }, []);

  
  return (
    <>
      {/* ESTAÇÕES */}
      {STATIONS.map((station) => (
        <Marker
          key={station.id}
          longitude={station.longitude}
          latitude={station.latitude}
          anchor="bottom"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setEstacaoSelecionada({
                id: station.id,
                nome: station.nome,
                latitude: station.latitude,
                longitude: station.longitude
              });
            }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
          >
            <div
              style={{
                width: estacaoSelecionada?.id === station.id ? "24px" : "16px",
                height: estacaoSelecionada?.id === station.id ? "24px" : "16px",
                borderRadius: "50%",
                backgroundColor: "#2A3D59",
                border: "3px solid white",
                boxShadow:
                  estacaoSelecionada?.id === station.id
                    ? "0 0 12px rgba(42,61,89,0.7)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                transition: "all 0.2s ease"
              }}
            />
          </div>
        </Marker>
      ))}

      {/* Legenda */}
      <div
        style={{
          position: "absolute",
          right: isMobile ? "10px" : "20px",
          top: "20px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          padding: isMobile ? "8px 10px" : "12px 14px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{ fontSize: isMobile ? "10px" : "12px", fontWeight: "700", textAlign: "center", marginBottom: isMobile ? "6px" : "10px", color: "#2A3D59" }}>
          Nível (cm)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
          <div
            style={{
              width: isMobile ? "10px" : "14px",
              height: isMobile ? "160px" : "300px",
              borderRadius: "4px",
              background: "linear-gradient(to top, #440154, #443983, #31688E, #21908C, #20A387, #35B779, #4EA53B, #B4DE2C, #FDE725, #F8961E, #DC2F02)",
              border: "1px solid rgba(42, 61, 89, 0.15)"
            }}
          />
          <div style={{ height: isMobile ? "160px" : "300px", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: isMobile ? "9px" : "11px", fontWeight: "600", color: "#2A3D59" }}>
            <span>200</span>
            <span></span>
            <span>150</span>
            <span></span>
            <span>100</span>
            <span></span>
            <span>50</span>
            <span></span>
            <span>0</span>
            <span></span>
            <span>-50</span>
          </div>
        </div>
      </div>

      {/* Timeline Interativa */}
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
          boxShadow: "0 10px 30px rgba(42, 61, 89, 0.15)",
          border: "1px solid rgba(42, 61, 89, 0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
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
                  <path d="M1.5 1.75V12.25L9.75 7L1.5 1.75Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span style={{ fontSize: isMobile ? "12px" : "15px", fontWeight: "700", color: "#2A3D59" }}>
              {dataFormatada || "..."}
            </span>
          </div>
          <span style={{ fontSize: isMobile ? "10px" : "12px", fontWeight: "600", background: "rgba(42, 61, 89, 0.1)", color: "#2A3D59", padding: isMobile ? "3px 8px" : "4px 10px", borderRadius: "20px" }}>
            + {timeStep}h
          </span>
        </div>

        <div style={{ position: "relative", width: "100%", padding: "5px 0" }}>
          <input
            type="range"
            min={0}
            max={maxTimeStep}
            step={1}
            value={timeStep}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer", accentColor: "#2A3D59" }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: isMobile ? "4px" : "8px" }}>
            {ticks.map((tick) => {
              let textoMarcador = tick === 0 ? "Início" : `+${tick}h`;

              if (dataBaseTimeline) {
                const dataMarcador = new Date(dataBaseTimeline);
                dataMarcador.setHours(dataMarcador.getHours() + tick);
                const dia = String(dataMarcador.getDate()).padStart(2, "0");
                const mesCurto = dataMarcador.toLocaleDateString("pt-BR", { month: "short" });
                textoMarcador = `${dia} ${mesCurto}`;
              }

              return (
                <div key={tick} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: isMobile ? "9px" : "11px", color: timeStep >= tick ? "#2A3D59" : "#A0AEC0" }}>
                  <div style={{ width: "2px", height: "5px", background: timeStep >= tick ? "#2A3D59" : "#CBD5E0", marginBottom: "4px" }} />
                  {textoMarcador}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CAMADA DE NÍVEL MAPBOX */}
      {geojson && (
        <Source id="water-level" type="geojson" data={geojson} tolerance={0} buffer={64}>
          <Layer
            id="water-level-layer"
            type="fill"
            paint={{
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "nivel"],
                -0.5,  "#440154",
                -0.25, "#443983",
                0.0,   "#31688E",
                0.25,  "#21908C",
                0.5,   "#20A387",
                0.75,  "#35B779",
                1.0,   "#4EA53B",
                1.25,  "#B4DE2C",
                1.5,   "#FDE725",
                1.75,  "#F8961E",
                2.0,   "#DC2F02"
              ],
              "fill-opacity": 0.9,
              "fill-antialias": false
            }}
          />
        </Source>
      )}
    </>
  );
}