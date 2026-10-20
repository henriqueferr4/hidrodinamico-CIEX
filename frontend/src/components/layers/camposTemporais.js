import { useState, useEffect } from "react";
import { buscarCenario } from "./camadas";

/* ==================== CARREGAMENTO DOS CAMPOS TEMPORAIS ==================== */

// Mantém as fontes sempre montadas (ordem das camadas estável no Mapbox)
export const VAZIO = { type: "FeatureCollection", features: [] };

const pad = (n) => String(n).padStart(2, "0");

export const formatarData = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

function lerDataHora(json) {
  const date = json?.date || json?.features?.[0]?.properties?.date;
  const hour = json?.hour || json?.features?.[0]?.properties?.hour;
  return date && hour ? { date, hour } : null;
}

export function extrairDataHora(json) {
  const dh = lerDataHora(json);
  if (!dh) return null;
  const [ano, mes, dia] = dh.date.split("-");
  return `${dia}/${mes}/${ano} ${dh.hour.substring(0, 5)}`;
}

/**
 * Caminho de um arquivo temporal.
 * Ex.: nivel_timestep_003, corrente_velocidade_timestep_003,
 *      maio_2024_vento_direcao_timestep_003
 */
export function caminhoDados(fonteDados, prefixo, tipo, timeStep) {
  const cenario = buscarCenario(fonteDados);
  const base = cenario ? `/data/${cenario.prefixo}_${prefixo}` : `/data/${prefixo}`;
  const timestep = String(timeStep).padStart(3, "0");
  return tipo ? `${base}_${tipo}_timestep_${timestep}.geojson` : `${base}_timestep_${timestep}.geojson`;
}

/**
 * Carrega um GeoJSON enquanto `ativo` for verdadeiro.
 * Desativado, os dados são descartados da memória. Ao trocar de URL, o dado
 * anterior continua na tela até o novo chegar (evita piscar durante a animação).
 * `transformar` deve ser estável (definido fora do componente).
 */
export function useGeojson(url, ativo, transformar) {
  const [estado, setEstado] = useState({ dados: null, dataHora: null });

  useEffect(() => {
    if (!ativo || !url) {
      setEstado({ dados: null, dataHora: null });
      return;
    }

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((resp) => {
        if (!resp.ok) throw new Error(`Arquivo ${url} não encontrado.`);
        return resp.json();
      })
      .then((json) => {
        setEstado({
          dados: transformar ? transformar(json) : json,
          dataHora: extrairDataHora(json)
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Erro ao carregar dados:", error.message);
        }
      });

    return () => controller.abort();
  }, [url, ativo, transformar]);

  return estado;
}

/** Data/hora do timestep 000 da fonte informada (início da timeline). */
export function useDataBase(fonteDados, prefixo, tipo) {
  const [dataBase, setDataBase] = useState(null);

  useEffect(() => {
    if (!prefixo) return;

    const controller = new AbortController();

    fetch(caminhoDados(fonteDados, prefixo, tipo, 0), { signal: controller.signal })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((json) => {
        const dh = lerDataHora(json);
        if (dh) setDataBase(new Date(`${dh.date}T${dh.hour}`));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Erro ao iniciar timeline:", error.message);
        }
      });

    return () => controller.abort();
  }, [fonteDados, prefixo, tipo]);

  return dataBase;
}
