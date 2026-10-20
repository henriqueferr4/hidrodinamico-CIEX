import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";

import * as htmlToImage from "html-to-image";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

// =====================================================================
// CONSTANTES / MAPAS DE CONFIGURAÇÃO DAS ESTAÇÕES
// =====================================================================

// Nome do sensor (usado para montar os paths dos arquivos JSON) por ID de estação
const SENSOR_POR_ID = {
  1: "FURG_CCMAR",
  2: "S_Lourenco",
  3: "Arambare",
  4: "S_Jose_Norte",
  5: "Itapua",
  6: "Tavares",
  7: "Pelotas",
  8: "Mostardas_DC",
  9: "ColoniaZ3_DC",
  10: "Itapua_DC",
  11: "Viamao_DC",
  12: "Saco_da_Mangueira",
};

// Cota de inundação (cm) por ID de estação
const COTA_INUNDACAO_POR_ID = {
  1: 80, // FURG_CCMAR
  2: 148, // S_Lourenco
  3: 225, // Arambare
  4: 80, // S_Jose_Norte
  5: 280, // Itapuã
};

// Estações que não devem plotar a linha da cota de inundação no gráfico
const ESTACOES_LINHA_COTA_OCULTA = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12];

const ESTACOES_DEFESA_CIVIL = [8, 9, 10, 11];

// Previsão do histórico (CSV: data,valor_real,valor_corrigido). Usa o valor
// corrigido, equivalente ao campo "valor" da previsão atual.
function lerCsvPrevisao(texto) {
  const [cabecalho, ...linhas] = texto.trim().split(/\r?\n/);
  const colunas = cabecalho.split(",");
  const iData = colunas.indexOf("data");
  const iValor = colunas.indexOf("valor_corrigido");
  return linhas
    .map((linha) => linha.split(","))
    .map((c) => ({ data: c[iData], valor: c[iValor] === "" ? null : Number(c[iValor]) }));
}

const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

// "2026-10-19T14:15:31.510299Z" → "Previsão atualizada em 19 de out. às 14:15 h"
// (horário como está no arquivo, seguindo o mesmo tratamento das demais datas do gráfico)
function formatarAtualizacao(texto) {
  const m = /^\d{4}-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto ?? "");
  if (!m) return null;
  const [, mes, dia, hora, minuto] = m;
  return `Previsão atualizada em ${Number(dia)} de ${MESES[Number(mes) - 1]} às ${hora}:${minuto} h`;
}

// Pastas e arquivos do histórico seguem AAAAMMDDhh; só a rodada das 00h é usada.
// Ex.: /data/historico/2026101600/time_series_Arambare_2026101600.csv
const HORA_HISTORICO = "00";

export const caminhoHistorico = (nomeSensor, dataRef) => {
  const referencia = `${dataRef}${HORA_HISTORICO}`; // dataRef: AAAAMMDD
  return `/data/historico/${referencia}/time_series_${nomeSensor}_${referencia}.csv`;
};

export { SENSOR_POR_ID };

/**
 * Gráfico de nível da estação.
 * - dataHistorico (AAAAMMDD): usa a previsão do histórico em vez da atual
 * - compacto: cabeçalho menor (gráficos secundários)
 * - ocultarCabecalho: o cabeçalho é exibido pelo componente pai (fixo no pop-up);
 *   no PNG baixado ele é desenhado sobre a imagem
 * - onDados: recebe a série unificada (previsão + observado) ao carregar
 * - onAtualizadoEm: recebe a data da última atualização, já formatada
 */
const ChartNivel = forwardRef(function ChartNivel(
  {
    estacaoSelecionada,
    titulo,
    dataHistorico = null,
    compacto = false,
    ocultarCabecalho = false,
    onDados,
    onAtualizadoEm
  },
  ref
) {
  // ---------------------------------------------------------------------
  // ESTADOS E REFS
  // ---------------------------------------------------------------------
  const chartRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erroMedio, setErroMedio] = useState(null);
  const [semPrevisao, setSemPrevisao] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const cotaInundacao = COTA_INUNDACAO_POR_ID[estacaoSelecionada.id] ?? null;
  const ocultarLinhaCota = ESTACOES_LINHA_COTA_OCULTA.includes(estacaoSelecionada.id);
  const isDefesaCivil = ESTACOES_DEFESA_CIVIL.includes(estacaoSelecionada.id);
  const LIMIAR_GAP_OBSERVADO_MS = 2 * 60 * 60 * 1000; // 2 horas

  // ---------------------------------------------------------------------
  // EIXO X (tempo) — domínio baseado no range de datas com previsão
  // ---------------------------------------------------------------------
  const dominioPrevisao = (() => {
    if (!data || data.length === 0) {
      return ["auto", "auto"];
    }

    const timestampsPrevisao = data
      .filter(
        (item) =>
          item.previsao !== null &&
          item.previsao !== undefined &&
          !isNaN(item.timestamp)
      )
      .map((item) => item.timestamp);

    if (timestampsPrevisao.length === 0) {
      return ["auto", "auto"];
    }

    return [Math.min(...timestampsPrevisao), Math.max(...timestampsPrevisao)];
  })();

  // Gera ticks fixos às 12h de cada dia dentro do domínio de previsão (desktop)
  const ticks12h = (() => {
    if (!data || data.length === 0) return [];
    if (dominioPrevisao[0] === "auto") return [];

    const [minTs, maxTs] = dominioPrevisao;

    const ticks = [];
    const cursor = new Date(minTs);
    cursor.setHours(12, 0, 0, 0);

    if (cursor.getTime() < minTs) {
      cursor.setDate(cursor.getDate() + 1);
    }

    while (cursor.getTime() <= maxTs) {
      ticks.push(cursor.getTime());
      cursor.setDate(cursor.getDate() + 1);
    }

    return ticks;
  })();

  // Reduz a quantidade de ticks pela metade para telas mobile
  const ticksMobile = ticks12h.filter((_, i) => i % 2 === 0);

  // ---------------------------------------------------------------------
  // EIXO Y (nível em cm) — domínio e ticks fixados em múltiplos de 5
  // ---------------------------------------------------------------------

  // Calcula o domínio (min/max) do eixo Y com margem de 15% e arredondado para múltiplo de 5
  const dominioY = (() => {
    const valores = data
      .flatMap((item) => [
        item.observado,
        item.observadoHidrosens,
        item.previsao,
        ocultarLinhaCota ? null : item.cotaInundacao,
      ])
      .filter((v) => v !== null && v !== undefined);

    if (valores.length === 0) return [0, 100];

    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const margem = (maximo - minimo) * 0.15;

    const min = Math.floor((minimo - margem) / 5) * 5;
    const max = Math.ceil((maximo + margem) / 5) * 5;

    return [min, max];
  })();

  // Escolhe um step múltiplo de 5 (ou maior) mantendo a quantidade de ticks legível
  const ticksY = (() => {
    const [min, max] = dominioY;
    const passos = [5, 10, 15, 20, 25, 50, 100];
    const alvoTicks = 8;

    const step =
      passos.find((p) => (max - min) / p <= alvoTicks) ??
      Math.ceil((max - min) / alvoTicks / 5) * 5;

    const ticks = [];
    for (let v = min; v <= max; v += step) {
      ticks.push(v);
    }
    return ticks;
  })();

  // ---------------------------------------------------------------------
  // RESPONSIVIDADE
  // ---------------------------------------------------------------------
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ---------------------------------------------------------------------
  // DOWNLOAD DO GRÁFICO COMO IMAGEM (PNG)
  // ---------------------------------------------------------------------
  const baixarGrafico = async () => {
    if (!chartRef.current) return;

    try {
      const PADDING = 12;
      const node = chartRef.current;
      const { width, height } = node.getBoundingClientRect();

      const opcoes = {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        width: width + PADDING * 2,
        height: height + PADDING * 2,
        style: {
          // como o canvas ficou maior, precisa "deslocar" o conteúdo
          // para dentro da nova área, senão ele fica grudado no canto
          transform: `translate(${PADDING}px, ${PADDING}px)`,
          transformOrigin: "top left",
          width: `${width}px`,
          height: `${height}px`,
        },
      };

      const dataUrl = ocultarCabecalho
        ? await comCabecalho(await htmlToImage.toCanvas(node, opcoes), opcoes.pixelRatio)
        : await htmlToImage.toPng(node, opcoes);

      const link = document.createElement("a");
      link.download = `nivel_${SENSOR_POR_ID[estacaoSelecionada.id]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  // Desenha o cabeçalho (estação, título e atualização) acima do gráfico no PNG
  const comCabecalho = (canvasGrafico, escala) => {
    const alturaCabecalho = 52 * escala;
    const canvas = document.createElement("canvas");
    canvas.width = canvasGrafico.width;
    canvas.height = canvasGrafico.height + alturaCabecalho;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margem = 16 * escala;
    const fonte = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#2A3D59";
    ctx.font = `700 ${18 * escala}px ${fonte}`;
    ctx.fillText(estacaoSelecionada.nome, margem, 26 * escala);

    ctx.fillStyle = "#718096";
    ctx.font = `600 ${11 * escala}px ${fonte}`;
    ctx.fillText((titulo ?? "").toUpperCase(), margem, 44 * escala);

    if (atualizadoEm) {
      // Mesmo destaque do pop-up: texto azul em "pílula" de fundo claro
      const texto = atualizadoEm;
      ctx.font = `700 ${12 * escala}px ${fonte}`;
      const largura = ctx.measureText(texto).width + 20 * escala;
      const alturaPilula = 20 * escala;
      const x = canvas.width - margem - largura;
      const y = 12 * escala;

      ctx.fillStyle = "rgba(42, 61, 89, 0.1)";
      ctx.beginPath();
      ctx.roundRect(x, y, largura, alturaPilula, alturaPilula / 2);
      ctx.fill();

      ctx.fillStyle = "#2A3D59";
      ctx.textBaseline = "middle";
      ctx.fillText(texto, x + 10 * escala, y + alturaPilula / 2);
      ctx.textBaseline = "alphabetic";
    }

    ctx.drawImage(canvasGrafico, 0, alturaCabecalho);
    return canvas.toDataURL("image/png");
  };

  // Expõe a função de download para o componente pai via ref
  useImperativeHandle(ref, () => ({
    baixarGrafico,
  }));

  // ---------------------------------------------------------------------
  // CARGA E UNIFICAÇÃO DOS DADOS (observado, previsão, correção, HidroSens)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!estacaoSelecionada) return;

    const nomeSensor = SENSOR_POR_ID[estacaoSelecionada.id];
    if (!nomeSensor) return;

    setLoading(true);
    setSemPrevisao(false);

    const carregarPrevisao = dataHistorico
      ? fetch(caminhoHistorico(nomeSensor, dataHistorico))
          .then((res) => {
            if (!res.ok) throw new Error("Previsão do histórico não encontrada");
            return res.text();
          })
          .then(lerCsvPrevisao)
          .catch(() => null)
      : fetch(`/data/time_serie_${nomeSensor}.json`)
          .then((res) => res.json())
          .catch(() => []);

    Promise.all([
      fetch(`/data/observado_sensor_${nomeSensor}.json`)
        .then((res) => res.json())
        .catch(() => []),
      carregarPrevisao,
      fetch(`/data/correcao_niveis.json`)
        .then((res) => res.json())
        .catch(() => ({})),
      // Somente a estação 7 utiliza o HidroSens/UFPel
      estacaoSelecionada.id === 7
        ? fetch(`/data/observado_sensor_Laranjal_Hidrosens.json`)
            .then((res) => res.json())
            .catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([jsonObservado, jsonPrevisao, jsonCorrecao, jsonHidrosens]) => {
        if (jsonPrevisao === null) {
          setSemPrevisao(true);
          setData([]);
          onDados?.([]);
          setLoading(false);
          return;
        }

        const mapaAgrupado = {};

        // --- Data da última atualização (não se aplica às previsões do histórico) ---
        const atualizacao = dataHistorico ? null : formatarAtualizacao(jsonCorrecao.gerado_em);
        setAtualizadoEm(atualizacao);
        onAtualizadoEm?.(atualizacao);

        // --- Erro médio de correção (usado na faixa de erro e no tooltip) ---
        // Não é exibido nas previsões do histórico
        const erro = dataHistorico ? null : jsonCorrecao[nomeSensor]?.mae_corrigido_cm;

        if (erro !== undefined && erro !== null) {
          setErroMedio(Number(erro.toFixed(2)));
        } else {
          setErroMedio(null);
        }

        // Normaliza diferentes formatos de data para timestamp (ms)
        const obterTimestamp = (dateStr) => {
          if (!dateStr) return null;
          let dataPadronizada = dateStr.includes(" ")
            ? dateStr.replace(" ", "T")
            : dateStr;
          dataPadronizada = dataPadronizada.replace(/Z$/, "").split(".")[0];
          const d = new Date(dataPadronizada);
          return !isNaN(d.getTime()) ? d.getTime() : null;
        };

        // --- Insere os pontos observados (CIEX) no mapa agrupado por timestamp ---
        jsonObservado.forEach((item) => {
          const ts = obterTimestamp(item.data);
          if (!ts) return;

          mapaAgrupado[ts] = {
            timestamp: ts,
            dataOriginal: item.data,
            observado: item.valor,
            observadoHidrosens: null,
            previsao: null,
          };
        });

        // --- Insere os pontos observados via HidroSens/UFPel (exclusivo estação 7) ---
        if (estacaoSelecionada.id === 7) {
          jsonHidrosens.forEach((item) => {
            const ts = obterTimestamp(item.data);
            if (!ts) return;

            const valor =
              item.valor !== null && item.valor !== undefined
                ? Number(item.valor)
                : null;

            if (mapaAgrupado[ts]) {
              mapaAgrupado[ts].observadoHidrosens = valor;
            } else {
              mapaAgrupado[ts] = {
                timestamp: ts,
                dataOriginal: item.data,
                observado: null,
                observadoHidrosens: valor,
                previsao: null,
              };
            }
          });
        }

        // --- Insere os pontos de previsão (convertendo metros para centímetros) ---
        jsonPrevisao.forEach((item) => {
          const ts = obterTimestamp(item.data);
          if (!ts) return;

          const valorEmCentimetros =
            item.valor !== null && item.valor !== undefined
              ? Number((item.valor * 100).toFixed(1))
              : null;

          if (mapaAgrupado[ts]) {
            mapaAgrupado[ts].previsao = valorEmCentimetros;
          } else {
            mapaAgrupado[ts] = {
              timestamp: ts,
              dataOriginal: item.data,
              observado: null,
              previsao: valorEmCentimetros,
            };
          }
        });

        // --- Monta a lista final ordenada, calculando a faixa de erro (min/max) ---
        const listaUnificada = Object.values(mapaAgrupado)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((item) => {
            const temPrevisao = item.previsao !== null && item.previsao !== undefined;
            const temErro = erro !== undefined && erro !== null;

            const previsaoMin =
              temPrevisao && temErro ? Number((item.previsao - erro).toFixed(1)) : null;

            const previsaoMax =
              temPrevisao && temErro ? Number((item.previsao + erro).toFixed(1)) : null;

            return {
              ...item,
              previsaoMin,
              previsaoMax,
              faixaErro:
                previsaoMin !== null && previsaoMax !== null
                  ? [previsaoMin, previsaoMax]
                  : null,
              cotaInundacao,
            };
          });

        // -----------------------------------------------------------------
        // SÉRIE PARA A LINHA OBSERVADA (observadoLinha)
        // - ponto observado: usa o próprio valor
        // - timestamp sem observado entre dois observados a <= 2h: interpola
        //   (evita que a linha seja cortada por timestamps só de previsão)
        // - gap real (> 2h) ou fora do range observado: null (linha quebra)
        // -----------------------------------------------------------------
        const obs = listaUnificada.filter(
          (i) => i.observado !== null && i.observado !== undefined
        );

        const listaComLinha = listaUnificada.map((item) => {
          if (item.observado !== null && item.observado !== undefined) {
            return { ...item, observadoLinha: item.observado };
          }

          // acha vizinhos observados (anterior e próximo)
          let ant = null;
          let prox = null;
          for (let k = 0; k < obs.length; k++) {
            if (obs[k].timestamp < item.timestamp) ant = obs[k];
            else {
              prox = obs[k];
              break;
            }
          }

          if (ant && prox && prox.timestamp - ant.timestamp <= LIMIAR_GAP_OBSERVADO_MS) {
            const f = (item.timestamp - ant.timestamp) / (prox.timestamp - ant.timestamp);
            return {
              ...item,
              observadoLinha: ant.observado + f * (prox.observado - ant.observado),
            };
          }

          return { ...item, observadoLinha: null }; // gap real: a linha quebra
        });

        setData(listaComLinha);
        onDados?.(listaComLinha);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro geral na unificação das séries:", error);
        setLoading(false);
      });
  }, [estacaoSelecionada, dataHistorico, onDados, onAtualizadoEm]);

  // ---------------------------------------------------------------------
  // RENDER — estado de carregamento
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#2A3D59",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        Sincronizando séries temporais...
      </div>
    );
  }

  if (semPrevisao) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#718096",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        Previsão não encontrada para esta data.
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // RENDER — gráfico principal
  // ---------------------------------------------------------------------
  return (
    <div style={{ width: "100%", height: "100%", minHeight: "200px", position: "relative" }}>
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Cabeçalho: nome da estação e título do gráfico */}
        {!ocultarCabecalho && (
        <div style={{ display: "flex", flexDirection: "column", padding: "4px 4px 0 4px" }}>
          <span style={{ fontSize: compacto ? "14px" : "18px", fontWeight: "700", color: "#2A3D59" }}>
            {estacaoSelecionada.nome}
          </span>
          <span
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#718096",
              fontWeight: "600",
            }}
          >
            {titulo}
          </span>
          {atualizadoEm && (
            <span style={{ fontSize: "11px", color: "#718096", fontWeight: "500", marginTop: "1px" }}>
              {atualizadoEm}
            </span>
          )}
        </div>
        )}

        {/* Ocupa só o espaço abaixo do cabeçalho (o eixo X não é cortado) */}
        <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />

            {/* Eixo X: timestamps com ticks fixos às 12h, formatados em pt-BR */}
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={dominioPrevisao}
              allowDataOverflow={true}
              interval={0}
              tickCount={isMobile ? 6 : 12}
              ticks={isMobile ? ticksMobile : ticks12h}
              tick={({ x, y, payload }) => {
                const d = new Date(payload.value);
                if (isNaN(d.getTime())) return null;

                const data = d.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                });
                const hora = d.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <g transform={`translate(${x},${y + 7})`}>
                    <text textAnchor="middle" fill="#666" fontSize="14px">
                      <tspan x="0" dy="10">
                        {data}
                      </tspan>
                      <tspan x="0" dy="14" fontSize="12px" fill="#888">
                        {hora}
                      </tspan>
                    </text>
                  </g>
                );
              }}
            />

            {/* Eixo Y: nível em cm, com domínio e ticks fixados em múltiplos de 5 */}
            <YAxis
              domain={dominioY}
              ticks={ticksY}
              allowDecimals={false}
              allowDataOverflow={true}
              tick={({ x, y, payload }) => (
                <text x={x - 5} y={y + 4} textAnchor="end" fontSize="14px" fill="#5f5f5f">
                  {payload.value}
                </text>
              )}
            >
              <Label
                value="Nível (cm)"
                angle={-90}
                position="insideLeft"
                style={{
                  textAnchor: "middle",
                  fill: "#5f5f5fff",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              />
            </YAxis>

            {/* Tooltip customizado: exibe valores das séries visíveis + cota + erro médio */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;

                const d = new Date(label);
                const dataFormatada = isNaN(d.getTime())
                  ? label
                  : d.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                const visiveis = payload.filter(
                  ({ dataKey }) =>
                    !["previsaoMin", "previsaoMax", "faixaErro", "cotaInundacao"].includes(
                      dataKey
                    )
                );

                return (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      padding: "8px 12px",
                      fontSize: 13,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 600 }}>{`Data: ${dataFormatada}`}</p>

                    {visiveis.map((p) => {
                      // Para a linha observada, mostra o valor medido (não o interpolado)
                      const valor =
                        p.dataKey === "observadoLinha" ? p.payload.observado : p.value;

                      return (
                        <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
                          {`${p.name}: ${
                            valor !== null && valor !== undefined ? `${valor} cm` : "Ausente"
                          }`}
                        </p>
                      );
                    })}

                    {cotaInundacao !== null && (
                      <p style={{ margin: 0, color: "#2e7d32", fontWeight: 400 }}>
                        {`Cota de Inundação: ${cotaInundacao} cm`}
                      </p>
                    )}

                    {erroMedio !== null && (
                      <p style={{ margin: 0, color: "#999" }}>{`± ${erroMedio} cm de margem de erro`}</p>
                    )}
                  </div>
                );
              }}
            />

            {/* Legenda própria: só mostra a cota se a estação tiver valor cadastrado */}
            <Legend
              verticalAlign="top"
              content={() => {
                const itens = [
                  { label: "Previsão", color: "#2A3D59", shape: "circle" },
                  {
                    label: isDefesaCivil ? "Observado - DC" : "Observado - CIEX",
                    color: isDefesaCivil ? "#F9A825" : "#ff7300",
                    shape: "circle",
                  },
                  ...(estacaoSelecionada.id === 7
                    ? [{ label: "Observado - HidroSens UFPel", color: "#7B1FA2", shape: "circle" }]
                    : []),
                  ...(erroMedio !== null
                    ? [{ label: "Erro médio", color: "#808080", shape: "rect" }]
                    : []),
                  ...(cotaInundacao !== null
                    ? [
                        {
                          label: `Cota de inundação (${cotaInundacao} cm)`,
                          color: "#2e7d32",
                          shape: "circle",
                        },
                      ]
                    : []),
                ];

                return (
                  <ul
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      listStyle: "none",
                      margin: 0,
                      padding: "0 0 15px 0",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {itens.map((item) => (
                      <li
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: item.color,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            background: item.color,
                            borderRadius: item.shape === "circle" ? "50%" : 2,
                            display: "inline-block",
                          }}
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                );
              }}
            />

            {/* Linha: observado (usa observadoLinha, sem buracos internos) */}
            <Line
              type="monotone"
              dataKey="observadoLinha"
              name={isDefesaCivil ? "Observado - DC" : "Observado - CIEX"}
              stroke={isDefesaCivil ? "#F9A825" : "#ff7300"}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Linha: observado HidroSens/UFPel (exclusiva da estação 7) */}
            {estacaoSelecionada.id === 7 && (
              <Line
                type="monotone"
                dataKey="observadoHidrosens"
                name="Observado - HidroSens UFPel"
                stroke="#7B1FA2"
                strokeWidth={2.5}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            )}

            {/* Linha: previsão */}
            <Line
              type="linear"
              dataKey="previsao"
              name="Previsão"
              stroke="#2A3D59"
              strokeWidth={2.5}
              dot={false}
              connectNulls={true}
            />

            {/* Área: faixa de erro médio em torno da previsão */}
            <Area
              type="monotone"
              dataKey="faixaErro"
              name="Erro médio"
              stroke="none"
              fill="#808080"
              fillOpacity={0.25}
              legendType="rect"
              connectNulls={true}
              isAnimationActive={false}
            />

            {/* Linha: cota de inundação (oculta para algumas estações) */}
            {!ocultarLinhaCota && (
              <Line
                type="linear"
                dataKey="cotaInundacao"
                name="Cota de Inundação"
                stroke="#2e7d32"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

export default ChartNivel;