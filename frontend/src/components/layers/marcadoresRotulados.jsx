import { useState, useEffect, useMemo } from "react";
import { Marker, useMap } from "react-map-gl/mapbox";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/* ==================== POSICIONAMENTO SEM SOBREPOSIÇÃO ====================
   A cada movimento do mapa, cada rótulo tenta as posições abaixo, na ordem,
   e fica na primeira que não encosta em outro rótulo nem em outro ponto.
   Se nenhuma couber (zoom distante), o rótulo é ocultado. */

const POSICOES = ["direita", "esquerda", "acima", "abaixo"];
const ESPACO = 6; // distância entre o ponto e o rótulo (px)
const FOLGA = 2; // margem mínima entre caixas (px)

let contextoMedida = null;

function medirTexto(texto, fonte) {
  if (!contextoMedida) contextoMedida = document.createElement("canvas").getContext("2d");
  contextoMedida.font = fonte;
  return contextoMedida.measureText(texto).width;
}

// Caixa (px de tela) do rótulo em uma posição, a partir do centro do ponto
function caixaRotulo(posicao, x, y, largura, altura, raio) {
  const d = raio + ESPACO;
  switch (posicao) {
    case "direita":
      return { x0: x + d, x1: x + d + largura, y0: y - altura / 2, y1: y + altura / 2 };
    case "esquerda":
      return { x0: x - d - largura, x1: x - d, y0: y - altura / 2, y1: y + altura / 2 };
    case "acima":
      return { x0: x - largura / 2, x1: x + largura / 2, y0: y - d - altura, y1: y - d };
    default:
      return { x0: x - largura / 2, x1: x + largura / 2, y0: y + d, y1: y + d + altura };
  }
}

const seSobrepoem = (a, b) =>
  a.x0 < b.x1 + FOLGA && a.x1 + FOLGA > b.x0 && a.y0 < b.y1 + FOLGA && a.y1 + FOLGA > b.y0;

// prioridades: ids separados por vírgula (string estável entre renderizações)
function usePosicoesRotulos(pontos, prioridades, { fonte, alturaRotulo, paddingX, raio }) {
  const { current: mapa } = useMap();
  const [posicoes, setPosicoes] = useState({});

  // Largura de cada rótulo medida com a fonte real
  const larguras = useMemo(
    () => Object.fromEntries(pontos.map((p) => [p.id, medirTexto(p.nome, fonte) + paddingX * 2 + 2])),
    [pontos, fonte, paddingX]
  );

  useEffect(() => {
    if (!mapa) return;
    const m = mapa.getMap();
    let quadro = null;

    const calcular = () => {
      quadro = null;
      const projetados = pontos.map((p) => ({ p, ...m.project([p.longitude, p.latitude]) }));

      // Os pontos selecionados têm prioridade; depois, a ordem da lista
      const prioritarios = new Set(prioridades ? prioridades.split(",") : []);
      const temPrioridade = (p) => prioritarios.has(String(p.id));
      projetados.sort((a, b) => temPrioridade(b.p) - temPrioridade(a.p));

      // Os próprios pontos também são obstáculos
      const ocupadas = projetados.map(({ x, y }) => ({ x0: x - raio, x1: x + raio, y0: y - raio, y1: y + raio }));

      const resultado = {};
      for (const { p, x, y } of projetados) {
        resultado[p.id] = null;
        for (const posicao of POSICOES) {
          const caixa = caixaRotulo(posicao, x, y, larguras[p.id], alturaRotulo, raio);
          if (!ocupadas.some((o) => seSobrepoem(o, caixa))) {
            resultado[p.id] = posicao;
            ocupadas.push(caixa);
            break;
          }
        }
      }
      setPosicoes(resultado);
    };

    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(calcular);
    };

    calcular();
    m.on("move", agendar);
    m.on("resize", agendar);
    return () => {
      m.off("move", agendar);
      m.off("resize", agendar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [mapa, pontos, prioridades, larguras, alturaRotulo, raio]);

  return posicoes;
}

/* ==================== RÓTULO ==================== */

function estiloPosicao(posicao, raio) {
  const d = `${raio + ESPACO}px`;
  switch (posicao) {
    case "esquerda":
      return { right: d, top: 0, transform: "translateY(-50%)" };
    case "acima":
      return { bottom: d, left: 0, transform: "translateX(-50%)" };
    case "abaixo":
      return { top: d, left: 0, transform: "translateX(-50%)" };
    default:
      return { left: d, top: 0, transform: "translateY(-50%)" };
  }
}

/* ==================== MARCADORES ==================== */

/**
 * Pontos clicáveis com rótulos que não se sobrepõem.
 * - pontos: [{ id, nome, latitude, longitude }] (lista estável)
 * - selecionados: ids dos pontos com gráfico aberto
 * - corPonto / corTexto: (ponto) => cor
 */
export default function MarcadoresRotulados({ pontos, selecionados = [], onSelecionar, corPonto, corTexto }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [emFoco, setEmFoco] = useState(null);

  const tamanhoFonte = isMobile ? 10 : 11.5;
  const paddingX = isMobile ? 6 : 8;
  const alturaRotulo = isMobile ? 18 : 21;
  const raio = 8; // ponto de 16px
  const fonte = `600 ${tamanhoFonte}px system-ui, -apple-system, sans-serif`;

  const posicoes = usePosicoesRotulos(pontos, selecionados.join(","), { fonte, alturaRotulo, paddingX, raio });

  return pontos.map((ponto) => {
    const selecionado = selecionados.includes(ponto.id);
    const focado = emFoco === ponto.id;
    // Rótulo oculto por falta de espaço volta a aparecer ao passar o mouse
    const posicao = posicoes[ponto.id] ?? (focado || selecionado ? "direita" : null);
    const tamanhoPonto = selecionado ? 24 : 16;
    const cor = corPonto(ponto);

    return (
      <Marker
        key={ponto.id}
        longitude={ponto.longitude}
        latitude={ponto.latitude}
        anchor="center"
        style={{ zIndex: focado || selecionado ? 2 : 1 }}
      >
        {/* Âncora de tamanho zero no centro do ponto */}
        <div
          onMouseEnter={() => setEmFoco(ponto.id)}
          onMouseLeave={() => setEmFoco(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelecionar(ponto);
          }}
          style={{ position: "relative", width: 0, height: 0, cursor: "pointer" }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${tamanhoPonto}px`,
              height: `${tamanhoPonto}px`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              backgroundColor: cor,
              border: "3px solid white",
              boxSizing: "border-box",
              boxShadow: selecionado ? `0 0 12px ${cor}` : "0 2px 6px rgba(0,0,0,0.4)",
              transition: "all 0.2s ease"
            }}
          />

          {posicao && (
            <div
              style={{
                position: "absolute",
                ...estiloPosicao(posicao, selecionado ? 12 : raio),
                height: `${alturaRotulo}px`,
                lineHeight: `${alturaRotulo - 2}px`,
                padding: `0 ${paddingX}px`,
                boxSizing: "border-box",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.95)",
                border: `1px solid ${selecionado || focado ? cor : "rgba(42, 61, 89, 0.10)"}`,
                boxShadow: focado || selecionado ? "0 3px 10px rgba(15, 23, 42, 0.22)" : "0 1px 4px rgba(15, 23, 42, 0.16)",
                color: corTexto(ponto),
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: `${tamanhoFonte}px`,
                fontWeight: selecionado ? 700 : 600,
                whiteSpace: "nowrap",
                userSelect: "none",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease"
              }}
            >
              {ponto.nome}
            </div>
          )}
        </div>
      </Marker>
    );
  });
}
