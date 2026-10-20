import { Fragment } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { CAMADAS_VETORES, COR_SETA, FUNDO_AMOSTRA_SETA } from "./layers/camadas";
import { REFERENCIA_SETAS, tamanhoSetaPx } from "./layers/layerCampos";

const AZUL = "#2A3D59";

// Seta horizontal com o comprimento exato (px) de uma seta do mapa na velocidade de referência
function SetaReferencia({ comprimento, cor }) {
  const altura = 12;
  const cabeca = Math.min(10, comprimento * 0.3);
  return (
    <svg width={comprimento} height={altura} viewBox={`0 0 ${comprimento} ${altura}`} aria-hidden="true">
      <rect x="0" y={altura / 2 - 1} width={comprimento - cabeca + 1} height="2" fill={cor} />
      <path d={`M${comprimento} ${altura / 2} L${comprimento - cabeca} 1 L${comprimento - cabeca} ${altura - 1} Z`} fill={cor} />
    </svg>
  );
}

/**
 * Escala das setas: o comprimento mostrado equivale ao valor de referência
 * no zoom atual do mapa.
 */
export default function EscalaVetores({ vetores }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const ativos = CAMADAS_VETORES.filter((v) => vetores[v.id]);
  if (!ativos.length) return null;

  const comprimentoPx = tamanhoSetaPx();
  const referencias = REFERENCIA_SETAS;

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        padding: isMobile ? "8px 10px" : "12px 14px",
        borderRadius: "12px",
        boxShadow: "0 6px 20px rgba(42, 61, 89, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: AZUL,
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "5px" : "7px"
      }}
    >
      {/* Grade de colunas fixas: nome | seta | valor, alinhados entre as linhas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          alignItems: "center",
          columnGap: isMobile ? "6px" : "10px",
          rowGap: isMobile ? "5px" : "7px"
        }}
      >
        {ativos.map((v) => (
          <Fragment key={v.id}>
            <span style={{ minWidth: 0, fontSize: isMobile ? "9px" : "11px", fontWeight: "700" }}>
              {v.rotulo}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 6px",
                borderRadius: "6px",
                background: FUNDO_AMOSTRA_SETA
              }}
            >
              <SetaReferencia comprimento={Math.round(comprimentoPx)} cor={COR_SETA[v.id]} />
            </span>
            <span style={{ fontSize: isMobile ? "9px" : "11px", fontWeight: "600", whiteSpace: "nowrap", textAlign: "right" }}>
              {referencias[v.id].valor} {referencias[v.id].unidade}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
