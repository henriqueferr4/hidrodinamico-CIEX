import JanelaGrafico from "./JanelaGrafico";
import LayerVazao from "./layers/layerVazao";
import LayerCampos from "./layers/layerCampos";
import { MarcadoresEstacoes, PainelEstacoes } from "./layers/layerEstacoes";
import { formatarData, useDataBase } from "./layers/camposTemporais";
import { ehCenario, ehCampoTemporal, horizonteTimeline } from "./layers/camadas";
import Timeline from "./Timeline";
import LegendaMapa from "./LegendaMapa";
import EscalaVetores from "./EscalaVetores";
import { useState, useEffect, useRef } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";


export default function MapView({
  style,
  graficos,
  abrirGrafico,
  fecharGrafico,
  fixarGrafico,
  timeStep,
  setTimeStep,
  painelAberto,
  fonteDados,
  camadaBase,
  vetores,
  mostrarMalha
}) {
  const mapRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      mapRef.current?.resize();
    }, 300);
  }, [painelAberto]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));


  // Na previsão, a camada de vazão mostra os pontos de vazão no lugar das estações
  const cenario = ehCenario(fonteDados);
  const mostrarVazao = camadaBase === "vazao" && !cenario;
  const mostrarEstacoes = !cenario && !mostrarVazao;

  // Pontos com gráfico aberto (destacados no mapa e na lista)
  const abertos = (tipo) => graficos.filter((g) => g.tipo === tipo).map((g) => g.ponto.id);

  const selecionarEstacao = (station, moverMapa = false) => {
    abrirGrafico("nivel", station);

    // Move o mapa somente quando solicitado, deixando espaço para o gráfico
    if (moverMapa && mapRef.current) {
      mapRef.current.flyTo({
        center: [station.longitude, station.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 8),
        duration: 1000,
        essential: true,
        offset: isMobile ? [0, -80] : [-250, 220]
      });
    }
  };

  // Timeline compartilhada: aparece quando há alguma camada temporal ativa
  const campoBase = ehCampoTemporal(camadaBase) ? camadaBase : null;
  const temCamadaTemporal = Boolean(campoBase) || vetores.corrente || vetores.vento;
  const { maxTimeStep, tickInterval } = horizonteTimeline(fonteDados);

  // Início da timeline: timestep 000 da camada base (ou dos vetores)
  const prefixoBase = campoBase ?? (vetores.corrente ? "corrente" : vetores.vento ? "vento" : null);
  const dataBaseTimeline = useDataBase(
    fonteDados,
    prefixoBase,
    campoBase === "nivel" ? null : campoBase ? "velocidade" : "direcao"
  );

  // Data do arquivo carregado; sem arquivo, calculada pela data base + timeStep
  const [dataDoArquivo, setDataDoArquivo] = useState(null);
  const dataFormatada =
    dataDoArquivo ||
    (dataBaseTimeline
      ? formatarData(new Date(dataBaseTimeline.getTime() + timeStep * 60 * 60 * 1000))
      : "");

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
        {!isMobile ? <NavigationControl position="top-left" /> : null}

        <LayerCampos
          fonteDados={fonteDados}
          timeStep={timeStep}
          camadaBase={camadaBase}
          vetores={vetores}
          mostrarMalha={mostrarMalha}
          onDataHora={setDataDoArquivo}
        />

        {mostrarEstacoes && (
          <MarcadoresEstacoes
            selecionados={abertos("nivel")}
            onSelecionar={selecionarEstacao}
          />
        )}

        {mostrarVazao && (
          <LayerVazao
            selecionados={abertos("vazao")}
            onSelecionar={(rio) => abrirGrafico("vazao", rio)}
          />
        )}
      </Map>

      {/* Coluna direita: legenda + lista de estações */}
      <div
        style={{
          position: "absolute",
          right: isMobile ? "10px" : "20px",
          top: isMobile ? "10px" : "20px",
          bottom: isMobile ? "110px" : "120px",
          zIndex: 1000,
          width: isMobile ? "150px" : "210px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "8px" : "10px",
          overflowY: "auto",
          scrollbarWidth: "none",
          pointerEvents: "none",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#2A3D59"
        }}
      >
        <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", gap: isMobile ? "8px" : "10px" }}>
          <LegendaMapa camadaBase={camadaBase} />
          {mostrarEstacoes && (
            <PainelEstacoes
              selecionados={abertos("nivel")}
              onSelecionar={selecionarEstacao}
            />
          )}
          <EscalaVetores vetores={vetores} />
        </div>
      </div>

      {temCamadaTemporal && (
        <Timeline
          timeStep={timeStep}
          setTimeStep={setTimeStep}
          maxTimeStep={maxTimeStep}
          tickInterval={tickInterval}
          dataFormatada={dataFormatada}
          dataBaseTimeline={dataBaseTimeline}
        />
      )}

      {/* Janelas de gráfico: a fixada fica no canto superior esquerdo e a
          outra acompanha o ponto no mapa */}
      {graficos.map((grafico, i) => (
        <JanelaGrafico
          key={grafico.chave}
          grafico={grafico}
          posicao={grafico.fixado ? "canto" : "ancorada"}
          empilhamento={i}
          onFechar={() => fecharGrafico(grafico.chave)}
          onFixar={() => fixarGrafico(grafico.chave)}
          mapRef={mapRef}
          isMobile={isMobile}
        />
      ))}
        </div>
  );
}