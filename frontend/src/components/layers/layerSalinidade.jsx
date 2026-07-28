import { useState, useEffect } from "react";
import { Source, Layer, Marker } from "react-map-gl/mapbox";

export default function LayerSalinidade({
  timeStep,
  setTimeStep,
  dataFormatada,
  setDataFormatada,
  fonteDados
}) {
  const [geojson, setGeojson] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;

    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep((prevStep) => {
          if (prevStep >= 120) {
            return 0;
          }
          return prevStep + 1;
        });
      }, 2500);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep]);

  useEffect(() => {
    if (!fonteDados) return;

    const controller = new AbortController();
    const { signal } = controller;

    const filename = `/data/${fonteDados}/salinidade/geojson/timestep_${String(timeStep).padStart(3, "0")}.geojson`;

    fetch(filename, { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Arquivo ${filename} não foi encontrado no servidor.`);
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
          console.error("Erro ao carregar GeoJSON de salinidade:", error.message);
        }
      });

    return () => controller.abort();
  }, [timeStep, fonteDados, setDataFormatada]);

  return (
    <>
      {/* LEGENDA */}
      <div
        style={{
          position: "absolute",
          right: "20px",
          top: "20px",
          zIndex: 1000,
          background: "rgba(255,255,255,0)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.4)",
          padding: "12px 14px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(42,61,89,0.1)",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: "10px",
            color: "#2A3D59"
          }}
        >
          Salinidade
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "14px",
              height: "300px",
              borderRadius: "4px",
              background:
                "linear-gradient(to top, #08306B, #2171B5, #41B6C4, #7FCDBB, #C7E9B4, #FFFFCC, #FED976, #FD8D3C, #F03B20)",
              border: "1px solid rgba(42,61,89,0.15)"
            }}
          />

          <div
            style={{
              height: "300px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "11px",
              fontWeight: "600",
              color: "#2A3D59"
            }}
          >
            <span>40</span>
            <span>35</span>
            <span>30</span>
            <span>25</span>
            <span>20</span>
            <span>15</span>
            <span>10</span>
            <span>5</span>
            <span>0</span>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "65%",
          minWidth: "400px",
          zIndex: 1000,
          background: "rgba(255,255,255,0)",
          backdropFilter: "blur(8px)",
          padding: "10px 18px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(42,61,89,0.15)",
          border: "1px solid rgba(42,61,89,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: "#2A3D59",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                color: "white"
              }}
            >
              {isPlaying ? (
                /* Ícone de Pause (Duas barras) */
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <path d="M2 1V11M8 1V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                /* Ícone de Play (Triângulo) */
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ marginLeft: "2px" }}>
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

            <span
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#2A3D59"
              }}
            >
              {dataFormatada || "..."}
            </span>
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: "600",
              background: "rgba(42,61,89,0.1)",
              color: "#2A3D59",
              padding: "4px 10px",
              borderRadius: "20px"
            }}
          >
            + {timeStep}h
          </span>
        </div>

        {/* Container do Input + Régua de Tempo */}
        <div style={{ position: "relative", width: "100%", padding: "5px 0" }}>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            value={timeStep}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
              accentColor: "#2A3D59",
              height: "6px",
              borderRadius: "3px",
              background: "#E2E8F0"
            }}
          />

          {/* Régua Visual (Marcadores da Linha do Tempo) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginTop: "8px",
              position: "relative",
              padding: "0 2px"
            }}
          >
            {[0, 24, 48, 72, 96, 120].map((tick) => {
              let textoMarcador = tick === 0 ? "Início" : `+${tick}h`;

              if (geojson) {
                const dateStr = geojson.date || geojson.features?.[0]?.properties?.date;
                const hourStr = geojson.hour || geojson.features?.[0]?.properties?.hour;

                if (dateStr && hourStr) {
                  const dataBase = new Date(`${dateStr}T${hourStr}`);

                  dataBase.setHours(dataBase.getHours() + tick);

                  const dia = String(dataBase.getDate()).padStart(2, "0");
                  const mesCurto = dataBase.toLocaleDateString("pt-BR", { month: "short" }); // Retorna "mai.", "jun.", etc.

                  textoMarcador = `${dia} ${mesCurto}`;
                }
              }

              return (
                <div
                  key={tick}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontSize: "11px",
                    color: timeStep >= tick ? "#2A3D59" : "#A0AEC0",
                    fontWeight: timeStep >= tick ? "600" : "400",
                    transition: "color 0.2s ease",
                    whiteSpace: "nowrap"
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      height: "5px",
                      background: timeStep >= tick ? "#2A3D59" : "#CBD5E0",
                      marginBottom: "4px",
                      borderRadius: "1px"
                    }}
                  />
                  {textoMarcador}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CAMADA DE SALINIDADE */}
      {geojson && (
        <Source id="flow" type="geojson" data={geojson} tolerance={0} buffer={64}>
          <Layer
            id="flow-layer"
            source="flow"
            type="fill"
            paint={{
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "salinidade"],
                0, "#08306B",
                5, "#2171B5",
                10, "#41B6C4",
                15, "#7FCDBB",
                20, "#C7E9B4",
                25, "#FFFFCC",
                30, "#FED976",
                35, "#FD8D3C",
                40, "#F03B20"
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