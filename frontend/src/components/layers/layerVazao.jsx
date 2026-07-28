import { useState, useEffect } from "react";
import { Source, Layer } from "react-map-gl/mapbox";

export default function LayerVazao() {
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetch("/data/previsao/vazao/rios_vazao.geojson", { signal })
      .then((res) => res.json())
      .then(setGeojson)
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      });

    return () => controller.abort();
  }, []);

  if (!geojson) return null;

  return (
    <Source id="rios" type="geojson" data={geojson}>
      {/* Linhas dos rios */}
      <Layer
        id="rios-layer"
        type="line"
        paint={{
          "line-color": "#2A3D59",
          "line-width": 4
        }}
      />

      {/* Rótulos */}
      <Layer
  id="rios-labels"
  type="symbol"
  layout={{
    "symbol-placement": "line",
    "text-field": ["get", "NORIOCOMP"],

    "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4, 10,
        6, 12,
        8, 14,
        10, 16
    ],

    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],

    "text-allow-overlap": true,
    "text-ignore-placement": true,
    "symbol-spacing": 30,
    "text-keep-upright": true
}}
  paint={{
    "text-color": "#2A3D59",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2
  }}
/>
    </Source>
  );
}