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
const ESTACOES_LINHA_COTA_OCULTA = [3, 5, 6, 7];

const ChartNivel = forwardRef(function ChartNivel({ estacaoSelecionada, titulo }, ref) {
  // ---------------------------------------------------------------------
  // ESTADOS E REFS
  // ---------------------------------------------------------------------
  const chartRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erroMedio, setErroMedio] = useState(null);
  const [dadosObservadoGrafico, setDadosObservadoGrafico] = useState([]);

  const cotaInundacao = COTA_INUNDACAO_POR_ID[estacaoSelecionada.id] ?? null;
  const ocultarLinhaCota = ESTACOES_LINHA_COTA_OCULTA.includes(estacaoSelecionada.id);
  const LIMIAR_GAP_OBSERVADO_MS = 60 * 60 * 1000; // 1 hora

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

      const dataUrl = await htmlToImage.toPng(chartRef.current, {
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
      });

      const link = document.createElement("a");
      link.download = `nivel_${SENSOR_POR_ID[estacaoSelecionada.id]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
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

    Promise.all([
      fetch(`/data/observado_sensor_${nomeSensor}.json`)
        .then((res) => res.json())
        .catch(() => []),
      fetch(`/data/time_serie_${nomeSensor}.json`)
        .then((res) => res.json())
        .catch(() => []),
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
        const mapaAgrupado = {};

        // --- Erro médio de correção (usado na faixa de erro e no tooltip) ---
        const erro = jsonCorrecao[nomeSensor]?.mae_corrigido_cm;

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

        setData(listaUnificada);

        // -----------------------------------------------------------------
        // QUEBRA DE LINHA SOMENTE PARA OBSERVADO HIDROSENS
        // Insere pontos "nulos" onde houver gaps > 1h na série HidroSens,
        // para que a linha não seja interpolada indevidamente
        // -----------------------------------------------------------------
        const pontosHidrosens = listaUnificada
          .filter(
            (item) =>
              item.observadoHidrosens !== null && item.observadoHidrosens !== undefined
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        const pontosDeQuebraHidrosens = [];

        pontosHidrosens.forEach((ponto, index) => {
          if (index === 0) return;

          const anterior = pontosHidrosens[index - 1];
          const gap = ponto.timestamp - anterior.timestamp;

          if (gap > LIMIAR_GAP_OBSERVADO_MS) {
            pontosDeQuebraHidrosens.push({
              timestamp: anterior.timestamp + 1,
              dataOriginal: null,
              observado: null,
              // quebra somente do HidroSens
              observadoHidrosens: null,
              previsao: null,
              previsaoMin: null,
              previsaoMax: null,
              faixaErro: null,
              cotaInundacao,
            });
          }
        });

        const listaComQuebras = [...listaUnificada, ...pontosDeQuebraHidrosens].sort(
          (a, b) => a.timestamp - b.timestamp
        );

        setData(listaComQuebras);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro geral na unificação das séries:", error);
        setLoading(false);
      });
  }, [estacaoSelecionada]);

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
        <div style={{ display: "flex", flexDirection: "column", padding: "4px 4px 0 4px" }}>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#2A3D59" }}>
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
        </div>

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

                    {visiveis.map((p) => (
                      <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
                        {`${p.name}: ${
                          p.value !== null && p.value !== undefined ? `${p.value} cm` : "Ausente"
                        }`}
                      </p>
                    ))}

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

            {/* Legenda customizada (itens fixos + cota de inundação condicional) */}
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="top"
              iconType="circle"
              iconSize={10}
              wrapperStyle={{
                paddingBottom: "15px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2A3D59",
              }}
              payload={[
                { value: "Observado", type: "circle", color: "#ff7300" },
                { value: "Previsão", type: "circle", color: "#2A3D59" },
                { value: "Erro médio", type: "rect", color: "#808080" },
                ...(cotaInundacao !== null
                  ? [
                      {
                        value: `Cota de Inundação: ${cotaInundacao} cm`,
                        type: "none",
                        color: "#2e7d32",
                      },
                    ]
                  : []),
              ]}
            />

            {/* Linha: observado CIEX */}
            <Line
              type="monotone"
              dataKey="observado"
              name="Observado - CIEX"
              stroke="#ff7300"
              strokeWidth={2.5}
              dot={false}
              connectNulls={true}
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
  );
});

export default ChartNivel;