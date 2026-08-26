import { Marker } from "react-map-gl/mapbox";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const RIOS_VAZAO = [
  {
    id: "Qguaiba",
    nome: "Guaíba",
    latitude: -30.384209,
    longitude: -51.082335,
  },
  {
    id: "Qcamaqua",
    nome: "Rio Camaquã",
    latitude: -31.287347,
    longitude: -51.740213,
  },
  {
    id: "Qpiratini",
    nome: "Rio Piratini",
    latitude: -32.013730,
    longitude: -52.418784,
  },
  {
    id: "Qjaguarao",
    nome: "Rio Jaguarão",
    latitude: -32.658506,
    longitude: -53.181426,
  },
  {
    id: "Qtacuari",
    nome: "Rio Tacuari",
    latitude: -32.771903,
    longitude: -53.305778,
  },
  {
    id: "Qcebollati",
    nome: "Rio Cebollati",
    latitude: -33.156727,
    longitude: -53.635344,
  },
  {
    id: "Qsaogoncalo",
    nome: "Canal São Gonçalo",
    latitude: -31.789522,
    longitude: -52.221304,
  },
];

export default function LayerVazao({
  rioSelecionado,
  setRioSelecionado,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Verde musgo principal
  const COR_VAZAO = "#00695C";

  return (
    <>
      {/* =====================================================
          RIOS / PONTOS DE VAZÃO
          ===================================================== */}
      {RIOS_VAZAO.map((rio) => (
        <Marker
          key={rio.id}
          longitude={rio.longitude}
          latitude={rio.latitude}
          anchor="bottom"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();

              setRioSelecionado({
                id: rio.id,
                nome: rio.nome,
                latitude: rio.latitude,
                longitude: rio.longitude,
              });
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            {/* Nome do rio */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                color: COR_VAZAO,

                padding: isMobile
                  ? "2px 5px"
                  : "3px 7px",

                borderRadius: "5px",

                fontSize: isMobile
                  ? "8px"
                  : "13px",

                fontWeight: "700",
                whiteSpace: "nowrap",

                marginBottom: "4px",

                boxShadow:
                  "0 2px 6px rgba(0, 0, 0, 0.2)",

                border:
                  "1px solid rgba(85, 107, 47, 0.18)",

                pointerEvents: "none",
              }}
            >
              {rio.nome}
            </div>

            {/* Ponto */}
            <div
              style={{
                width:
                  rioSelecionado?.id === rio.id
                    ? "24px"
                    : "16px",

                height:
                  rioSelecionado?.id === rio.id
                    ? "24px"
                    : "16px",

                borderRadius: "50%",

                backgroundColor: COR_VAZAO,

                border: "3px solid white",

                boxShadow:
                  rioSelecionado?.id === rio.id
                    ? "0 0 12px #00695C"
                    : "0 2px 6px rgba(0,0,0,0.4)",

                transition: "all 0.2s ease",
              }}
            />
          </div>
        </Marker>
      ))}

      {/* =====================================================
          LEGENDA
          ===================================================== */}
      {/* <div
        style={{
          position: "absolute",

          right: isMobile
            ? "10px"
            : "20px",

          top: "20px",

          zIndex: 1000,

          background:
            "rgba(255, 255, 255, 0.8)",

          backdropFilter: "blur(8px)",

          border:
            "1px solid rgba(255, 255, 255, 0.4)",

          padding: isMobile
            ? "8px 10px"
            : "12px 14px",

          borderRadius: "12px",

          boxShadow:
            "0 6px 20px rgba(42, 61, 89, 0.1)",

          fontFamily:
            "system-ui, -apple-system, sans-serif",
        }}
      > */}
        {/* <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: isMobile
                ? "10px"
                : "12px",

              height: isMobile
                ? "10px"
                : "12px",

              borderRadius: "50%",

              backgroundColor: COR_VAZAO,

              border: "2px solid white",

              boxShadow:
                "0 1px 4px rgba(0, 0, 0, 0.35)",

              flexShrink: 0,
            }}
          /> */}

          {/* <span
            style={{
              color: COR_VAZAO,

              fontSize: isMobile
                ? "9px"
                : "12px",

              fontWeight: "700",

              whiteSpace: "nowrap",
            }}
          >
            Pontos de Vazão
          </span> */}
        {/* </div> */}
      {/* </div> */}
    </>
  );
}

export { RIOS_VAZAO };