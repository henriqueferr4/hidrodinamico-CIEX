import MarcadoresRotulados from "./marcadoresRotulados";

const RIOS_VAZAO = [
  {
    id: "Qguaiba",
    nome: "Guaíba",
    latitude: -30.096002,
    longitude: -51.291111,
  },
  {
    id: "Qcamaqua",
    nome: "Rio Camaquã",
    latitude: -31.288251,
    longitude: -51.751941,
  },
  // {
  //   id: "Qpiratini",
  //   nome: "Rio Piratini",
  //   latitude: -32.013730,
  //   longitude: -52.418784,
  // },
  // {
  //   id: "Qjaguarao",
  //   nome: "Rio Jaguarão",
  //   latitude: -32.658506,
  //   longitude: -53.181426,
  // },
  // {
  //   id: "Qtacuari",
  //   nome: "Rio Tacuari",
  //   latitude: -32.771903,
  //   longitude: -53.305778,
  // },
  // {
  //   id: "Qcebollati",
  //   nome: "Rio Cebollati",
  //   latitude: -33.156727,
  //   longitude: -53.635344,
  // },
  {
    id: "Qsaogoncalo",
    nome: "Canal São Gonçalo",
    latitude: -31.799259,
    longitude: -52.356020,
  },
];

// Verde musgo principal
const COR_VAZAO = "#00695C";

/** Pontos de vazão; o clique abre o gráfico. */
export default function LayerVazao({ selecionados, onSelecionar }) {
  return (
    <MarcadoresRotulados
      pontos={RIOS_VAZAO}
      selecionados={selecionados}
      onSelecionar={onSelecionar}
      corPonto={() => COR_VAZAO}
      corTexto={() => COR_VAZAO}
    />
  );
}

export { RIOS_VAZAO };