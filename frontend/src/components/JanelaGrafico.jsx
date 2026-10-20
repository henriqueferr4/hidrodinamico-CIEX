import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, Pin, X } from "lucide-react";
import PainelGraficoNivel from "./PainelGraficoNivel";
import LineChartVazao from "./LineChartVazao";

// Tamanho das janelas no desktop, por tipo de gráfico
const TAMANHO = {
  nivel: { largura: 800, altura: 380 },
  vazao: { largura: 800, altura: 320 }
};

// Canto superior esquerdo do mapa (ao lado dos controles de zoom)
const CANTO = { esquerda: 56, topo: 10 };

const estiloJanela = {
  background: "rgba(255, 255, 255, 0.88)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.4)",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(42, 61, 89, 0.2)",
  display: "flex",
  flexDirection: "column",
  fontFamily: "system-ui, -apple-system, sans-serif",
  pointerEvents: "auto",
  boxSizing: "border-box"
};

function BotaoJanela({ onClick, titulo, cor, tamanho, children }) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      style={{
        background: "rgba(42, 61, 89, 0.1)",
        border: "none",
        borderRadius: "50%",
        width: `${tamanho}px`,
        height: `${tamanho}px`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: cor,
        transition: "background 0.2s"
      }}
    >
      {children}
    </button>
  );
}

// Posição em pixels do ponto no mapa, atualizada quando o mapa se move
function usePixelDoPonto(mapRef, ponto, ativo) {
  const [pixel, setPixel] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ativo) return;
    const atualizar = () => {
      const p = map.project([ponto.longitude, ponto.latitude]);
      setPixel({ x: p.x, y: p.y });
    };
    atualizar();
    map.on("move", atualizar);
    return () => map.off("move", atualizar);
  }, [mapRef, ponto.longitude, ponto.latitude, ativo]);

  return pixel;
}

/**
 * Janela completa de um gráfico (nível ou vazão).
 * - posicao "ancorada": acompanha o ponto no mapa (padrão)
 * - posicao "canto": fixada no canto superior esquerdo ("Fixar na tela")
 */
export default function JanelaGrafico({ grafico, posicao, onFechar, onFixar, mapRef, isMobile, empilhamento }) {
  const graficoRef = useRef(null);
  const { tipo, ponto } = grafico;
  const ancorada = posicao === "ancorada";
  const pixel = usePixelDoPonto(mapRef, ponto, ancorada && !isMobile);

  const nivel = tipo === "nivel";
  const corBotoes = nivel ? "#2A3D59" : "#00695C";
  const tamanhoBotao = isMobile ? 22 : 24;
  const tamanhoIcone = isMobile ? 11 : 13;

  const botoes = (
    <div style={{ display: "flex", gap: isMobile ? "6px" : "8px" }}>
      {/* Some quando a janela já está fixada */}
      {ancorada && (
        <BotaoJanela onClick={onFixar} titulo="Fixar na tela" cor={corBotoes} tamanho={tamanhoBotao}>
          <Pin size={tamanhoIcone} />
        </BotaoJanela>
      )}
      <BotaoJanela
        onClick={() => graficoRef.current?.baixarGrafico()}
        titulo="Baixar gráfico (PNG)"
        cor={corBotoes}
        tamanho={tamanhoBotao}
      >
        <Download size={tamanhoIcone} />
      </BotaoJanela>
      <BotaoJanela onClick={onFechar} titulo="Fechar" cor={corBotoes} tamanho={tamanhoBotao}>
        <X size={tamanhoIcone} />
      </BotaoJanela>
    </div>
  );

  const conteudo = nivel ? (
    <PainelGraficoNivel
      ref={graficoRef}
      estacaoSelecionada={ponto}
      titulo="Previsão de Nível"
      alturaGrafico={isMobile ? 205 : 250}
      isMobile={isMobile}
      acoes={botoes}
    />
  ) : (
    <>
      <div style={{ position: "absolute", top: isMobile ? 10 : 18, right: isMobile ? 10 : 18, zIndex: 1000 }}>
        {botoes}
      </div>
      <div style={{ flexGrow: 1, width: "100%", height: "100%", minHeight: 0 }}>
        <LineChartVazao ref={graficoRef} rioSelecionado={ponto} titulo="Previsão de Vazão" />
      </div>
    </>
  );

  // Celular: o gráfico ancorado fica embaixo e o anterior fica no topo da tela
  if (isMobile) {
    return createPortal(
      <div
        style={{
          ...estiloJanela,
          position: "fixed",
          zIndex: 2000 + empilhamento,
          left: "50%",
          transform: "translateX(-50%)",
          ...(ancorada ? { bottom: "16px" } : { top: "64px" }),
          width: "95vw",
          maxWidth: "95vw",
          height: nivel ? "320px" : "260px",
          padding: "10px 12px"
        }}
      >
        {conteudo}
      </div>,
      document.body
    );
  }

  const { largura, altura } = TAMANHO[tipo];

  return (
    <div
      style={{
        ...estiloJanela,
        position: "absolute",
        zIndex: 1010 + empilhamento,
        ...(ancorada
          ? { left: `${pixel.x - 5}px`, top: `${pixel.y - altura - 20}px` }
          : { left: `${CANTO.esquerda}px`, top: `${CANTO.topo}px` }),
        width: `${largura}px`,
        height: `${altura}px`,
        padding: "16px"
      }}
    >
      {conteudo}
    </div>
  );
}
