import LayerNivel from "./layers/layerNivel";
import ChartNivel from "./LineChartNivel";
import LayerVazao from "./layers/layerVazao";
import SidebarVazao from "./layers/sidebarVazao";
import LayerVento from "./layers/layerVento";
import LayerCorrente from "./layers/layerCorrente";
import LayerMalha from "./layers/layerMalha"
import { useState, useEffect, useRef } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Download } from "lucide-react";
import { X } from 'lucide-react';

// Título de cada gráfico, por variável ativa
const TITULOS_VARIAVEL = {
  nivel: "Previsão de Nível",
  vento: "Vento",
  corrente: "Corrente",
  vazao: "Vazão"
};

export default function MapView({
  style,
  estacaoSelecionada,
  setEstacaoSelecionada,
  timeStep,
  setTimeStep,
  sidebarOpen,
  variavelAtiva,
  fonteDados
}) {
  const mapRef = useRef();
  const chartApiRef = useRef(null);


  useEffect(() => {
    setTimeout(() => {
      mapRef.current?.resize();
    }, 300);
  }, [sidebarOpen]);

  const [dataFormatada, setDataFormatada] = useState("");
  const [posicaoPixel, setPosicaoPixel] = useState({ x: 0, y: 0 });

  // Bloco para adaptar gráficos as estações selecionadas
  const atualizarPosicaoGrafico = () => {
    if (!mapRef.current || !estacaoSelecionada) return;
    const map = mapRef.current.getMap();     
    const pixel = map.project([estacaoSelecionada.longitude, estacaoSelecionada.latitude]);   
    setPosicaoPixel({
      x: pixel.x,
      y: pixel.y
    });
  };

  useEffect(() => {
    if (!estacaoSelecionada) return;
    atualizarPosicaoGrafico(); 
    const map = mapRef.current?.getMap();
    if (map) {
      map.on("move", atualizarPosicaoGrafico); 
    }

    return () => {
      map?.off("move", atualizarPosicaoGrafico);
    };
  }, [estacaoSelecionada]);

  const [geojsonVazao, setGeojsonVazao] = useState(null);

  useEffect(() => {
      fetch("/data/previsao/vazao/rios_vazao.geojson")
          .then(r => r.json())
          .then(setGeojsonVazao);
  }, []);
  
  const tituloGrafico = TITULOS_VARIAVEL[variavelAtiva] ?? "";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Map
        ref={mapRef}
        reuseMaps
        trackResize
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -51.5,
          latitude: -31.25,
          zoom: 6
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ position: "absolute", inset: 0 }}
      >
        <NavigationControl position="top-left" />

        {/* 1. Camada de Nível */}
        {variavelAtiva === "nivel" && (
          <LayerNivel
            timeStep={timeStep}
            setTimeStep={setTimeStep}
            estacaoSelecionada={estacaoSelecionada}
            setEstacaoSelecionada={setEstacaoSelecionada}
            dataFormatada={dataFormatada}
            setDataFormatada={setDataFormatada}
            fonteDados={fonteDados}
          />
        )}

        
        {variavelAtiva === "vazao" && geojsonVazao && (
            <>
                <LayerVazao geojson={geojsonVazao}/>
                <SidebarVazao geojson={geojsonVazao}/>
            </>
        )}

        {/* 3. Camada de Vento */}
        {variavelAtiva === "vento" && (
          <LayerVento
            timeStep={timeStep}
            setTimeStep={setTimeStep}
            dataFormatada={dataFormatada}
            setDataFormatada={setDataFormatada}
            fonteDados={fonteDados} 
          />
        )}

        {/* 4. Camada de Corrente */}
        {variavelAtiva === "corrente" && ( 
          <LayerCorrente
            timeStep={timeStep}
            setTimeStep={setTimeStep}
            dataFormatada={dataFormatada}
            setDataFormatada={setDataFormatada}
            fonteDados={fonteDados} 
          />
        )}

        {/* MALHA */}
        {variavelAtiva === "malha" && ( 
          <LayerMalha
          fonteDados={fonteDados}
          />
        )}

      </Map>

      {/* Pop-up do Gráfico de Nível */}
      {variavelAtiva === "nivel" && estacaoSelecionada && (
        <div
          style={{
            position: "absolute",
            zIndex: 1010, 
            left: `${posicaoPixel.x - 5}px`,
            top: `${posicaoPixel.y - 340}px`,
            width: "800px",
            height: "320px",
            background: "rgba(255, 255, 255, 0.88)", 
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            borderRadius: "16px",
            padding: "16px 16px 16px 16px ",
            boxShadow: "0 10px 30px rgba(42, 61, 89, 0.2)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "system-ui, -apple-system, sans-serif",
            pointerEvents: "auto",
            boxSizing: "border-box"
          }}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "2px", 
            flexShrink: 0 
          }}
          >


          <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            display: "flex",
            gap: "8px",
            zIndex: 1000,
          }}
        >
              <button
                onClick={() => chartApiRef.current?.baixarGrafico()}
                title="Baixar gráfico (PNG)"
                style={{
                  background: "rgba(42, 61, 89, 0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2A3D59",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(42, 61, 89, 0.2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(42, 61, 89, 0.1)"}
              >
                <Download size={13} />
              </button>

              <button
                onClick={() => setEstacaoSelecionada(null)}
                title="Fechar"
                style={{
                  background: "rgba(42, 61, 89, 0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2A3D59",
                  fontWeight: "bold",
                  fontSize: "12px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(42, 61, 89, 0.2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(42, 61, 89, 0.1)"}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div style={{ flexGrow: 1, width: "100%", height: "100%", minHeight: 0 }}>
            <ChartNivel
                ref={chartApiRef}
                estacaoSelecionada={estacaoSelecionada}
                titulo={tituloGrafico}
            />
          </div>
        </div>
      )}
    </div>
  );
}