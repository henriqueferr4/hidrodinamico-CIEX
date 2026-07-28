import { useState, useEffect } from "react";
import { Source, Layer } from "react-map-gl/mapbox";

export default function LayerMalha({ fonteDados, visivel = true }) {
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    if (!fonteDados) return;

    const controller = new AbortController();
    const { signal } = controller;

    const filename = `/data/malha/malha.geojson`;

    fetch(filename, { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Arquivo ${filename} não encontrado no servidor.`);
        }
        return response.json();
      })
      .then((data) => {
        setGeojson(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Erro ao carregar GeoJSON da malha:", error.message);
        }
      });

    return () => controller.abort();
  }, [fonteDados]);

  if (!geojson || !visivel) return null;

  return (
    <Source id="malha-source" type="geojson" data={geojson}>
      {/* Preenchimento sutil dos triângulos */}
      <Layer
        id="malha-fill"
        type="fill"
        paint={{
          "fill-color": "#1d4ed8",
          "fill-opacity": 0.05
        }}
      />

      {/* Contorno dos elementos triangulares */}
      <Layer
        id="malha-linha"
        type="line"
        paint={{
          "line-color": "#1d4ed8",
          "line-width": 0.5,
          "line-opacity": 0.4
        }}
      />
    </Source>
  );
}