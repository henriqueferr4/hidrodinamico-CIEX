import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
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

export default function ChartNivel({ estacaoSelecionada }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

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
      fetch(`/data/time_serie_${nomeSensor}.json`).then(res => res.json()).catch(() => [])
    ])
      .then(([jsonObservado, jsonPrevisao]) => {
        const mapaAgrupado = {};

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

        const listaUnificada = Object.values(mapaAgrupado).sort((a, b) => a.timestamp - b.timestamp);

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
        <LineChart
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

          <YAxis>
            <Label
              value="Nível (cm)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: "middle", fill: "#5f5f5fff", fontWeight: "600", fontSize: "16px" }}
            />
          </YAxis>

          <Tooltip
            labelFormatter={(label) => {
              const d = new Date(label);
              return isNaN(d.getTime())
                ? label
                : `Data: ${d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
            }}
            formatter={(value, name) => [value !== null && value !== undefined ? `${value} cm` : "Ausente", name]}
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
            strokeDasharray=""
            dot={false}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}