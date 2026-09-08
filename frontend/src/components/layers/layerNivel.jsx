import { useState, useEffect } from "react";
import { Source, Layer, Marker } from "react-map-gl/mapbox";
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
  { id: 9, nome: "Colônia Z3", latitude: -31.702306, longitude: -52.156611},
];

export default function LayerNivel({
  timeStep,
  setTimeStep,
  dataFormatada,
  setDataFormatada,
  estacaoSelecionada,
  setEstacaoSelecionada,
  fonteDados
}) {
  const [geojson, setGeojson] = useState(null);
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

    let filename;

    if (fonteDados === "cenario1") {
      filename = `/data/maio_2024_nivel_timestep_${timestepFormatado}.geojson`;
    } else {
      filename = `/data/nivel_timestep_${timestepFormatado}.geojson`;
    }

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

  const selecionarEstacao = (station) => {
    setEstacaoSelecionada({
      id: station.id,
      nome: station.nome,
      latitude: station.latitude,
      longitude: station.longitude
    });
  };

  
  return (
    <>
      {/* ESTAÇÕES */}
      {fonteDados === "previsao" && STATIONS.map((station) => (
        <Marker
          key={station.id}
          longitude={station.longitude}
          latitude={station.latitude}
          anchor="bottom"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              selecionarEstacao(station);
            }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
          >
          {/* <div
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            color:
            station.id === 8 || station.id === 9
              ? "#F9A825"
              : "#2A3D59",
            padding: isMobile ? "2px 5px" : "3px 7px",
            borderRadius: "5px",
            fontSize: isMobile ? "8px" : "13px",
            fontWeight: "700",
            whiteSpace: "nowrap",
            marginBottom: "4px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(42, 61, 89, 0.15)",
            pointerEvents: "none"
          }}
        >
          {station.nome}
        </div> */}
            <div
              style={{
                width: estacaoSelecionada?.id === station.id ? "24px" : "16px",
                height: estacaoSelecionada?.id === station.id ? "24px" : "16px",
                borderRadius: "50%",
                backgroundColor:
                station.id === 8 || station.id === 9
                  ? "#F9A825"
                  : "#2A3D59",
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

      {/* Legenda das estações */}
{fonteDados === "previsao" && (
  <div
    style={{
      position: "absolute",
      right: isMobile ? "10px" : "20px",

      top: isMobile ? "310px" : "430px",

      zIndex: 1000,

      background: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(8px)",
      padding: isMobile ? "8px 10px" : "12px 14px",
      borderRadius: "12px",
      boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.4)",

      width: isMobile ? "150px" : "210px",

      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#2A3D59",
    }}
  >
    {/* Título */}
    <div
      style={{
        fontSize: isMobile ? "10px" : "12px",
        fontWeight: "700",
        textAlign: "left",
        marginBottom: isMobile ? "6px" : "10px",
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
        gap: "7px",
        marginBottom: "6px",
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
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: isMobile ? "10px" : "12px",
          fontWeight: "600",
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
        gap: "7px",
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
        flexShrink: 0,
      }}
    />
      <span
        style={{
          fontSize: isMobile ? "10px" : "12px",
          fontWeight: "600",
        }}
      >
        Defesa Civil
      </span>
    </div>
  </div>
)}

    {/* Lista de estações */}
{fonteDados === "previsao" && (
  <div
    style={{
      position: "absolute",
      right: isMobile ? "10px" : "20px",
      top: isMobile ? "10px" : "20px",
      zIndex: 1000,

      background: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(8px)",
      padding: isMobile ? "8px" : "12px",
      borderRadius: "12px",
      boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.4)",

      width: isMobile ? "150px" : "210px",

      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#2A3D59",
    }}
  >
    {/* Título */}
    <div
      style={{
        fontSize: isMobile ? "10px" : "12px",
        fontWeight: "700",
        marginBottom: isMobile ? "6px" : "10px",
        color: "#2A3D59",
      }}
    >
      ESTAÇÕES
    </div>

    {/* Botões das estações */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "3px" : "5px",
      }}
    >
      {[...STATIONS]
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", {
            sensitivity: "base",
          })
        )
        .map((station) => {
          const defesaCivil =
            station.id === 8 || station.id === 9;

          const selecionada =
            estacaoSelecionada?.id === station.id;

          const stationColor = defesaCivil
            ? "#F9A825"
            : "#2A3D59";

          return (
            <button
              key={station.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selecionarEstacao(station);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "6px" : "8px",

                background: selecionada
                  ? "rgba(42, 61, 89, 0.10)"
                  : "rgba(255,255,255,0.55)",

                border: selecionada
                  ? `1px solid ${stationColor}`
                  : "1px solid rgba(42,61,89,0.08)",

                borderRadius: "7px",

                padding: isMobile
                  ? "5px 6px"
                  : "7px 8px",

                cursor: "pointer",
                textAlign: "left",

                transition: "all 0.15s ease",

                fontFamily: "inherit",
              }}
            >
              {/* Nome */}
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
  </div>
)}
      {/* Legenda de cores - Nível */}
      <div
        style={{
          position: "absolute",
          right: isMobile ? "10px" : "20px",
          top: isMobile ? "430px" : "545px",
          zIndex: 1000,

          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",

          width: isMobile ? "150px" : "210px",
          boxSizing: "border-box",

          padding: isMobile ? "8px 10px" : "12px 14px",

          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",

          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Título */}
        <div
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "700",
            textAlign: "left",
            marginBottom: isMobile ? "6px" : "8px",
            color: "#2A3D59",
          }}
        >
          NÍVEL (cm)
        </div>

        {/* Barra horizontal */}
        <div
          style={{
            width: "100%",
            height: isMobile ? "10px" : "14px",
            borderRadius: "4px",

            background:
              "linear-gradient(to right, #440154, #443983, #31688E, #21908C, #20A387, #35B779, #4EA53B, #B4DE2C, #FDE725, #F8961E, #DC2F02)",

            border: "1px solid rgba(42, 61, 89, 0.15)",
            boxSizing: "border-box",
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
            color: "#2A3D59",
          }}
        >
          <span>-50</span>
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
        </div>
      </div>

    {/* Timeline Interativa */}
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? "28px" : "20px",
        left: "50%",
        transform: "translateX(-50%)",

        width: isMobile ? "94%" : "68%",
        minWidth: isMobile ? "0" : "520px",

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
        gap: isMobile ? "4px" : "6px",
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
          boxSizing: "border-box",
        }}
      >
        {/* Data e hora */}
        <span
          style={{
            fontSize: isMobile ? "11px" : "14px",
            fontWeight: "700",
            color: "#2A3D59",
            whiteSpace: "nowrap",
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
            color: "#2A3D59",

            padding: isMobile ? "2px 6px" : "3px 8px",
            borderRadius: "20px",

            whiteSpace: "nowrap",
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
        gap: isMobile ? "10px" : "12px",
      }}
    >
      {/* Play / Pause */}
      <div
        style={{
          // Alinha o centro do botão com a linha do slider
          paddingTop: isMobile ? "0px" : "0px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: "#2A3D59",
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

            padding: 0,
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
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Slider */}
        <div
          style={{
            // Mesma altura do botão.
            // O slider fica exatamente no centro vertical.
            height: isMobile ? "30px" : "34px",

            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="range"
            min={0}
            max={maxTimeStep}
            step={1}
            value={timeStep}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
              accentColor: "#2A3D59",
              margin: 0,
              padding: 0,
            }}
          />
        </div>

        {/* Marcadores */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            marginTop: isMobile ? "2px" : "3px",
          }}
        >
          {ticks.map((tick) => {
            let textoMarcador =
              tick === 0 ? "Início" : `+${tick}h`;

            if (dataBaseTimeline) {
              const dataMarcador = new Date(dataBaseTimeline);

              dataMarcador.setHours(
                dataMarcador.getHours() + tick
              );

              const dia = String(
                dataMarcador.getDate()
              ).padStart(2, "0");

              const mesCurto =
                dataMarcador.toLocaleDateString("pt-BR", {
                  month: "short",
                });

              textoMarcador = `${dia} ${mesCurto}`;
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

                  color:
                    timeStep >= tick
                      ? "#2A3D59"
                      : "#A0AEC0",

                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    width: "2px",
                    height: isMobile ? "4px" : "5px",

                    background:
                      timeStep >= tick
                        ? "#2A3D59"
                        : "#CBD5E0",

                    marginBottom: "3px",
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