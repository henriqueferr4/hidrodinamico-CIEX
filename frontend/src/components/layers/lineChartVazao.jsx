import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Label,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";

export default function LineChartVazao({ nome, vazao }) {

    const dados = Object.entries(vazao).map(([data, valor]) => ({
        data: data.substring(5), 
        valor
    }));

    return (
        <div
            style={{
                width: "100%",
                height: 180,
                marginBottom: 20
            }}
        >
            <h4 style={{ margin: "0 0 5px 0" }}>{nome}</h4>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={dados}
                    margin={{
                        top: 5,
                        right: 15,
                        left: 10,
                        bottom: 20
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        dataKey="data"
                        tick={{ fontSize: 10 }}
                    />

                    <YAxis
                        tick={{ fontSize: 10 }}
                        width={55}
                    >
                        <Label
                            value="Vazão (m³/s)"
                            angle={-90}
                            position="insideLeft"
                            style={{
                                textAnchor: "middle",
                                fontSize: 12
                            }}
                        />
                    </YAxis>

                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="#2A3D59"
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}