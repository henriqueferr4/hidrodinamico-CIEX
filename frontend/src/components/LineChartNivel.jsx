import { useEffect, useState } from "react";
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
  Label
} from "recharts";

const SENSOR_POR_ID = {
  1: "FURG_CCMAR",
  2: "S_Lourenco",
  3: "Arambare",
  4: "S_Jose_Norte",
  5: "Itapua"
};

const COTA_INUNDACAO_POR_ID = {
  1: 80,   // FURG_CCMAR
  2: 148,  // S_Lourenco
  3: 225,  // Arambare
  4: 80,  // S_Jose_Norte
  5: 280   // Itapua
};

export default function ChartNivel({ estacaoSelecionada }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erroMedio, setErroMedio] = useState(null);
  const cotaInundacao = COTA_INUNDACAO_POR_ID[estacaoSelecionada.id] ?? null;

  const ticks12h = data && data.length > 0
    ? data
        .filter((item) => {
          if (!item || !item.timestamp) return false;
          const d = new Date(item.timestamp);
          return !isNaN(d.getTime()) && d.getHours() === 12 && d.getMinutes() === 0;
        })
        .map((item) => item.timestamp)
    : [];

  useEffect(() => {
    if (!estacaoSelecionada) return;

    const nomeSensor = SENSOR_POR_ID[estacaoSelecionada.id];
    if (!nomeSensor) return;

    setLoading(true);

    Promise.all([
      fetch(`/data/observado_sensor_${nomeSensor}.json`).then(res => res.json()).catch(() => []),
      fetch(`/data/time_serie_${nomeSensor}.json`).then(res => res.json()).catch(() => []),
      fetch(`/data/correcao_niveis.json`).then(res => res.json()).catch(() => ({}))
    ])
      .then(([jsonObservado, jsonPrevisao, jsonCorrecao]) => {
        const mapaAgrupado = {};

        const erro = jsonCorrecao[nomeSensor]?.mae_corrigido_cm;

        if (erro !== undefined && erro !== null) {
          setErroMedio(Number(erro.toFixed(2)));
        } else {
          setErroMedio(null);
        }

        const obterTimestamp = (dateStr) => {
          if (!dateStr) return null;
          let dataPadronizada = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
          dataPadronizada = dataPadronizada.replace(/Z$/, "").split(".")[0];
          const d = new Date(dataPadronizada);
          return !isNaN(d.getTime()) ? d.getTime() : null;
        };

        jsonObservado.forEach((item) => {
          const ts = obterTimestamp(item.data);
          if (!ts) return;

          mapaAgrupado[ts] = {
            timestamp: ts,
            dataOriginal: item.data,
            observado: item.valor,
            previsao: null
          };
        });

        jsonPrevisao.forEach((item) => {
          const ts = obterTimestamp(item.data);
          if (!ts) return;

          const valorEmCentimetros = item.valor !== null && item.valor !== undefined
            ? Number((item.valor * 100).toFixed(1))
            : null;

          if (mapaAgrupado[ts]) {
            mapaAgrupado[ts].previsao = valorEmCentimetros;
          } else {
            mapaAgrupado[ts] = {
              timestamp: ts,
              dataOriginal: item.data,
              observado: null,
              previsao: valorEmCentimetros
            };
          }
        });

    const listaUnificada = Object.values(mapaAgrupado)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => {
        const temPrevisao = item.previsao !== null && item.previsao !== undefined;
        const temErro = erro !== undefined && erro !== null;

        const previsaoMin = temPrevisao && temErro
          ? Number((item.previsao - erro).toFixed(1))
          : null;

        const previsaoMax = temPrevisao && temErro
          ? Number((item.previsao + erro).toFixed(1))
          : null;

        return {
          ...item,
          previsaoMin,
          previsaoMax,
          faixaErro: (previsaoMin !== null && previsaoMax !== null)
            ? [previsaoMin, previsaoMax]
            : null,
          cotaInundacao // mesmo valor repetido em todos os pontos
        };
      });

        setData(listaUnificada);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro geral na unificação das séries:", error);
        setLoading(false);
      });

  }, [estacaoSelecionada]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#2A3D59", fontSize: "12px", fontWeight: "600" }}>
        Sincronizando séries temporais...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "200px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={ticks12h}
            tickFormatter={(value) => {
              const d = new Date(value);
              return isNaN(d.getTime())
                ? ""
                : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            }}
            label={{
              value: "Data",
              position: "insideBottom",
              offset: -10,
              dy: 5,
              style: { fill: "#5f5f5fff", fontWeight: "600", fontSize: "16px" }
            }}
          />

          <YAxis
            tickCount={8}
            allowDecimals={false}
            domain={([dataMin, dataMax]) => {
              const valores = [
                dataMin,
                dataMax,
                cotaInundacao,
              ].filter(v => v !== null && v !== undefined);

              const minimo = Math.min(...valores);
              const maximo = Math.max(...valores);

              const margem = (maximo - minimo) * 0.15;

              const min = Math.floor((minimo - margem) / 5) * 5;
              const max = Math.ceil((maximo + margem) / 5) * 5;

              return [min, max];
          }}>
            <Label
              value="Nível (cm)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: "middle", fill: "#5f5f5fff", fontWeight: "600", fontSize: "16px" }}
            />
          </YAxis>

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;

              const d = new Date(label);
              const dataFormatada = isNaN(d.getTime())
                ? label
                : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

              // esconde as séries auxiliares usadas só para desenhar a faixa
              const visiveis = payload.filter(
                ({ dataKey }) =>
                  !["previsaoMin", "previsaoMax", "faixaErro"].includes(dataKey)
              );

              return (
                <div style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 4, padding: "8px 12px", fontSize: 13 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{`Data: ${dataFormatada}`}</p>
                  {visiveis.map((p) => (
                    <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
                      {`${p.name}: ${p.value !== null && p.value !== undefined ? `${p.value} cm` : "Ausente"}`}
                    </p>
                  ))}
                  {erroMedio !== null && (
                    <p style={{ margin: 0, color: "#999" }}>{`± ${erroMedio} cm de margem de erro`}</p>
                  )}
                </div>
              );
            }}
          />

          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="top"
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ paddingBottom: "15px", fontSize: "13px", fontWeight: "600", color: "#2A3D59" }}
          />

        <Line
          type="monotone"
          dataKey="observado"
          name="Observado"
          stroke="#ff7300"
          strokeWidth={2.5}
          dot={false}
          connectNulls={true}
        />

        <Line
          type="linear"
          dataKey="previsao"
          name="Previsão"
          stroke="#2A3D59"
          strokeWidth={2.5}
          dot={false}
          connectNulls={true}
        />

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

        <Line
          type="linear"
          dataKey="cotaInundacao"
          name="Cota de Inundação"
          stroke="#2e7d32"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          connectNulls={true}
          isAnimationActive={false}
        />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}