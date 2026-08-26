import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ComposedChart,
  Line,
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

const LineChartVazao = forwardRef(function LineChartVazao(
  {
    rioSelecionado,
    titulo = "Previsão de Vazão",
    fonteCsv = "/data/IPH.csv",
  },
  ref
) {
  // ---------------------------------------------------------------------
  // ESTADOS E REFS
  // ---------------------------------------------------------------------
  const chartRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // ---------------------------------------------------------------------
  // EIXO X (tempo) — domínio baseado no range de datas do CSV
  // ---------------------------------------------------------------------
  const dominioTempo = (() => {
    if (!data || data.length === 0) return ["auto", "auto"];

    const timestamps = data
      .filter((item) => !isNaN(item.timestamp))
      .map((item) => item.timestamp);

    if (timestamps.length === 0) return ["auto", "auto"];

    return [Math.min(...timestamps), Math.max(...timestamps)];
  })();

  // Como os dados são diários, um tick por dia (sem hora)
  const ticksDiarios = data.map((item) => item.timestamp);

  // ---------------------------------------------------------------------
  // EIXO Y (vazão em m³/s) — domínio e ticks com margem, arredondados
  // ---------------------------------------------------------------------
  const dominioY = (() => {
    const valores = data
      .flatMap((item) => [item.previsao])
      .filter((v) => v !== null && v !== undefined);

    if (valores.length === 0) return [0, 100];

    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const margem = (maximo - minimo) * 0.15 || maximo * 0.1;

    // Vazão costuma variar em centenas/milhares de m³/s, então o passo
    // de arredondamento precisa ser proporcional à escala dos valores
    const escala = Math.max(1, Math.pow(10, Math.floor(Math.log10(maximo || 1)) - 1));

    const min = Math.max(0, Math.floor((minimo - margem) / escala) * escala);
    const max = Math.ceil((maximo + margem) / escala) * escala;

    return [min, max];
  })();

  const ticksY = (() => {
    const [min, max] = dominioY;
    const alvoTicks = 8;
    const passoBruto = (max - min) / alvoTicks;

    // Arredonda o passo para um número "redondo" (1, 2, 5 x potência de 10)
    const magnitude = Math.pow(10, Math.floor(Math.log10(passoBruto || 1)));
    const candidatos = [1, 2, 2.5, 5, 10].map((m) => m * magnitude);
    const step = candidatos.find((c) => (max - min) / c <= alvoTicks) ?? candidatos.at(-1);

    const ticks = [];
    for (let v = min; v <= max; v += step) {
      ticks.push(Math.round(v));
    }
    return ticks;
  })();

  // ---------------------------------------------------------------------
  // RESPONSIVIDADE
  // ---------------------------------------------------------------------
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const ticksMobile = ticksDiarios.filter((_, i) => i % 2 === 0);

  // ---------------------------------------------------------------------
  // DOWNLOAD DO GRÁFICO COMO IMAGEM (PNG) — mesmo padrão do ChartNivel
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
          transform: `translate(${PADDING}px, ${PADDING}px)`,
          transformOrigin: "top left",
          width: `${width}px`,
          height: `${height}px`,
        },
      });

      const link = document.createElement("a");
      link.download = `vazao_${rioSelecionado?.id ?? "grafico"}.png`;
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
  // CARGA E PARSE DO CSV
  // ---------------------------------------------------------------------
  useEffect(() => {
    setLoading(true);
    setErro(null);

    fetch(fonteCsv)
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao buscar CSV (status ${res.status})`);
        return res.text();
      })
      .then((texto) => {
        const linhas = texto.trim().split("\n").map((l) => l.replace("\r", ""));
        const cabecalho = linhas[0].split(",");
        const datas = cabecalho.slice(1); // ex: ["2026-08-24", ...]

        const porRio = {};
        for (let i = 1; i < linhas.length; i++) {
          const colunas = linhas[i].split(",");
          const rio = colunas[0];
          if (!rio) continue;
          porRio[rio] = colunas.slice(1).map(Number);
        }

        // Guarda datas/valores brutos para remontar a série ao trocar o rio
        setDadosBrutos({ datas, porRio });
        setLoading(false);
      })
      .catch((e) => {
        setErro(e.message);
        setLoading(false);
      });
  }, [fonteCsv]);

  // ---------------------------------------------------------------------
  // MONTAGEM DA SÉRIE DO RIO SELECIONADO (equivalente à unificação do ChartNivel)
  // ---------------------------------------------------------------------
  const [dadosBrutos, setDadosBrutos] = useState(null);

  useEffect(() => {
    if (!dadosBrutos || !rioSelecionado) return;

    const { datas, porRio } = dadosBrutos;
    const valores = porRio[rioSelecionado.id] ?? [];

    const listaUnificada = datas.map((dataIso, i) => {
      // Timestamp fixado ao meio-dia (dado é diário, não horário)
      const ts = new Date(`${dataIso}T12:00:00`).getTime();

      return {
        timestamp: ts,
        dataOriginal: dataIso,
        previsao: valores[i] ?? null,
        // --- Espaço reservado para quando houver dado observado de vazão:
        // observado: valorObservado ?? null,
      };
    });

    setData(listaUnificada);
  }, [dadosBrutos, rioSelecionado]);

  // ---------------------------------------------------------------------
  // RENDER — sem rio selecionado
  // ---------------------------------------------------------------------
  if (!rioSelecionado) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#00695C",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        Selecione um rio no mapa.
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // RENDER — estados de carregamento / erro
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#00695C",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        Sincronizando séries de vazão...
      </div>
    );
  }

  if (erro) {
    return (
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#b00020",
          fontSize: "12px",
          fontWeight: "600",
          textAlign: "center",
          padding: "0 12px",
        }}
      >
        Erro ao carregar dados de vazão: {erro}
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // RENDER — gráfico principal
  // ---------------------------------------------------------------------
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "200px",
        position: "relative",
      }}
    >
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
        {/* Cabeçalho: nome do rio e título do gráfico */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "4px 4px 0 4px",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#00695C",
            }}
          >
            {rioSelecionado?.nome ?? "Rio"}
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

            {/* Eixo X: timestamps diários, formatados em pt-BR (sem hora) */}
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={dominioTempo}
              allowDataOverflow={true}
              interval={0}
              tickCount={isMobile ? 4 : 7}
              ticks={isMobile ? ticksMobile : ticksDiarios}
              tick={({ x, y, payload }) => {
                const d = new Date(payload.value);
                if (isNaN(d.getTime())) return null;

                const dataFmt = d.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                });

                return (
                  <g transform={`translate(${x},${y + 7})`}>
                    <text textAnchor="middle" fill="#666" fontSize="14px">
                      <tspan x="0" dy="10">
                        {dataFmt}
                      </tspan>
                    </text>
                  </g>
                );
              }}
            />

            {/* Eixo Y: vazão em m³/s, domínio e ticks calculados em escala "redonda" */}
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
                value="Vazão (m³/s)"
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

            {/* Tooltip customizado */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;

                const d = new Date(label);
                const dataFormatada = isNaN(d.getTime())
                  ? label
                  : d.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });

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
                    {payload.map((p) => (
                      <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
                        {`${p.name}: ${
                          p.value !== null && p.value !== undefined
                            ? `${p.value} m³/s`
                            : "Ausente"
                        }`}
                      </p>
                    ))}
                  </div>
                );
              }}
            />

            {/* Legenda customizada */}
          <Legend
  layout="horizontal"
  align="center"
  verticalAlign="top"
  content={() => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px",
        paddingBottom: "15px",
        fontSize: "13px",
        fontWeight: "600",
        color: "#00695C",
      }}
    >
      {/* Ponto colorido */}
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: "#00695C",
          display: "inline-block",
        }}
      />

      <span>Vazão (m³/s)</span>
    </div>
  )}
/>

          {/* Linha: previsão de vazão */}
         <Line
  type="linear"
  dataKey="previsao"
  name="Previsão"
  stroke="#00695C"
  strokeWidth={2.5}
  connectNulls={true}
  isAnimationActive={false}

  dot={(props) => {
    const { cx, cy, payload } = props;

    const ticksVisiveis = isMobile
      ? ticksMobile
      : ticksDiarios;

    const mostrarPonto = ticksVisiveis.includes(
      payload.timestamp
    );

    if (!mostrarPonto) {
      return null;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#00695C"
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  }}
/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default LineChartVazao;