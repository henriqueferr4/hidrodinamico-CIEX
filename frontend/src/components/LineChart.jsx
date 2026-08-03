import { useEffect, useState } from "react";
import { Legend } from "recharts";
import { Label } from "recharts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

export default function Chart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/IPH_20260423.csv")
      .then(res => res.text())
      .then(text => {
        const rows = text.trim().split("\n").map(r => r.split(","));

        const dates = rows[0].slice(1); // datas (header)

        const parsed = dates.map((date, i) => {
          const obj = { data: date };

          rows.slice(1).forEach(row => {
            const name = row[0];
            const value = Number(row[i + 1]);
            obj[name] = value;
          });

          return obj;
        });

        setData(parsed);
      });
  }, []);

  return (
    <div style={{ width: "80%", height: 400 }}>
      <ResponsiveContainer>
        <LineChart 
  data={data}
  margin={{ top: 10, right: 1, left: 30, bottom: 30 }}
>
          <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="data">
          <Label value="Data"  position="insideBottom" offset={-5}/>
        </XAxis>

        <YAxis>
          <Label value="Vazão (m³/s)" angle={-90} position="insideLeft"/>
        </YAxis>
          <Tooltip />
<Legend
  layout="vertical"
  align="right"
  verticalAlign="middle"
  wrapperStyle={{
    right: 0,
    paddingLeft: "10px",
    lineHeight: "28px"
  }}
/>
          {/* Linhas */}
          <Line dataKey="Qguaiba" name="Guaíba" stroke="#2A3D59" />
          <Line dataKey="Qcamaqua" name="Camaquã" stroke="#ff7300" />
          <Line dataKey="Qpiratini" name="Piratini" stroke="#00bcd4" />
          <Line dataKey="Qjaguarao" name="Jaguarão" stroke="#8bc34a" />
          <Line dataKey="Qtacuari" name="Tacuarí" stroke="#e91e63" />
          <Line dataKey="Qcebollati" name="Cebollatina" stroke="#9c27b0" />
          <Line dataKey="Qsaogoncalo" name="São Gonçalo" stroke="#795548" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}