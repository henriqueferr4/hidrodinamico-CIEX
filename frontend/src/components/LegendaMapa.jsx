import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { CAMADAS_BASE } from "./layers/camadas";

const AZUL = "#2A3D59";

const estiloCartao = (isMobile) => ({
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(8px)",
  padding: isMobile ? "8px 10px" : "12px 14px",
  borderRadius: "12px",
  boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.4)"
});

export function IconeSeta({ cor, tamanho = 12 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 10.5V2M6 2L2.75 5.25M6 2L9.25 5.25"
        stroke={cor}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Legenda de cores da camada base ativa. */
export default function LegendaMapa({ camadaBase }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const base = CAMADAS_BASE.find((c) => c.id === camadaBase && c.gradiente);
  if (!base) return null;

  return (
    <div style={estiloCartao(isMobile)}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: "700",
              marginBottom: isMobile ? "6px" : "8px",
              color: AZUL
            }}
          >
            {base.legenda}
          </div>

          <div
            style={{
              width: "100%",
              height: isMobile ? "10px" : "14px",
              borderRadius: "4px",
              background: base.gradiente,
              border: "1px solid rgba(42, 61, 89, 0.15)",
              boxSizing: "border-box"
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginTop: "5px",
              fontSize: isMobile ? "9px" : "11px",
              fontWeight: "600",
              color: AZUL
            }}
          >
            {base.rotulos.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
    </div>
  );
}
