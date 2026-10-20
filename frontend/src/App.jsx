import { useState, useEffect, useRef } from "react";
import MainLayout from "./layout/MainLayout";
import { ehCenario } from "./components/layers/camadas";
import Modal from "react-modal";
import "./components/Modal.css";
import MapView from "./components/MapView";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

Modal.setAppElement("#root");


function App() {
  // Controla telas internas do dashboard (inicia direto em "nivel")
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [modalAberto, setModalAberto] = useState(false);
  const [timeStep, setTimeStep] = useState(0);
  const [painelAberto, setPainelAberto] = useState(true);
  const [fonteDados, setFonteDados] = useState("previsao");

  // Gráficos abertos (nível ou vazão). No máximo dois: um fixado no canto
  // superior esquerdo e um ancorado no ponto do mapa.
  // - Abrir um gráfico substitui o ancorado (o fixado permanece)
  // - "Fixar na tela" leva o gráfico para o canto; um fixado anterior é fechado
  const [graficos, setGraficos] = useState([]);

  const abrirGrafico = (tipo, ponto) => {
    const chave = `${tipo}-${ponto.id}`;
    setGraficos((atuais) => {
      if (atuais.some((g) => g.chave === chave)) return atuais;
      const novo = {
        chave,
        tipo,
        fixado: false,
        ponto: { id: ponto.id, nome: ponto.nome, latitude: ponto.latitude, longitude: ponto.longitude }
      };
      return [...atuais.filter((g) => g.fixado), novo];
    });
  };

  const fixarGrafico = (chave) =>
    setGraficos((atuais) =>
      atuais
        .filter((g) => g.chave === chave || !g.fixado)
        .map((g) => (g.chave === chave ? { ...g, fixado: true } : g))
    );

  const fecharGrafico = (chave) => setGraficos((atuais) => atuais.filter((g) => g.chave !== chave));

  // Camadas do mapa, controladas pelo painel
  const [camadaBase, setCamadaBase] = useState("nivel"); // "nivel" | "corrente" | "vento" | "vazao" | null (malha)
  const [vetores, setVetores] = useState({ corrente: false, vento: false });
  const [mostrarMalha, setMostrarMalha] = useState(false);

  // Malha é exclusiva: ao ativar, as demais camadas são desligadas e guardadas
  // para serem restauradas quando a malha for desativada
  const camadasAntesDaMalha = useRef(null);

  const alternarMalha = (ativo) => {
    setMostrarMalha(ativo);
    if (ativo) {
      camadasAntesDaMalha.current = { camadaBase, vetores };
      setCamadaBase(null);
      setVetores({ corrente: false, vento: false });
    } else {
      const anterior = camadasAntesDaMalha.current;
      const base = anterior?.camadaBase ?? "nivel";
      setCamadaBase(base === "vazao" && ehCenario(fonteDados) ? "nivel" : base);
      setVetores(anterior?.vetores ?? { corrente: false, vento: false });
    }
  };

  // Escolher qualquer outra camada desativa a malha
  const selecionarBase = (id) => {
    setMostrarMalha(false);
    setCamadaBase(id);
  };

  const alterarVetores = (atualizar) => {
    setMostrarMalha(false);
    setVetores(atualizar);
  };

  useEffect(() => {
    setModalAberto(true);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setPainelAberto(false);
    }
  }, [isMobile]);

  // Na camada de vazão só existem pontos de vazão (e, nas demais, só estações):
  // fecha os gráficos do tipo que deixou de estar visível
  useEffect(() => {
    const tipoVisivel = camadaBase === "vazao" ? "vazao" : "nivel";
    setGraficos((atuais) => atuais.filter((g) => g.tipo === tipoVisivel));
  }, [camadaBase]);

  // Previsão e cenário têm horizontes diferentes: a timeline recomeça
  const trocarFonte = (fonte) => {
    if (fonte === fonteDados) return;
    setFonteDados(fonte);
    setTimeStep(0);
    setGraficos([]);
    // Vazão só existe na previsão
    if (camadaBase === "vazao") setCamadaBase("nivel");
  };

  return (
      // Modal: tela de aviso inicial com informações sobre a ferramenta
      <>
      <Modal className="modal" 
        overlayClassName="overlay"
        isOpen={modalAberto}
        onRequestClose={() => setModalAberto(false)}
      >
        <h2 className="modal-titulo">Previsão Hidrodinânica</h2>
        <br></br>

        <p className="modal-texto">Este painel integra as ferramentas do Centro Interinstitucional de Observação e Previsão de Eventos Extremos (CIEX). 
          Possui como objetivo avaliar o comportamento hidrodinâmico da <b>Lagoa dos Patos</b> por meio de simulações do modelo <b>TELEMAC</b>.</p>

        <p className="modal-texto">As previsões disponibilizadas neste <i>dashboard</i> possuem horizonte de 72 horas (3 dias), contadas a partir da data atual de execução do modelo e atualizadas diariamente.</p>
        
        <p className="modal-texto">O painel conta ainda com ferramentas que possibilitam a visualização de cenários específicos e o comportamento das principais variáveis hidrodinâmicas associadas.</p>
        
        <button onClick={() => setModalAberto(false)}  className="botao-modal">
          Visualizar
        </button>
      </Modal>

{/* Layout Principal da Aplicação */}
      <MainLayout
        painel={{
          open: painelAberto,
          setOpen: setPainelAberto,
          fonteDados,
          setFonteDados: trocarFonte,
          camadaBase,
          setCamadaBase: selecionarBase,
          vetores,
          setVetores: alterarVetores,
          mostrarMalha,
          setMostrarMalha: alternarMalha
        }}
      >
        {/* DASHBOARD HIDRODINÂMICO */}
          <div style={styles.dashboardContainer}>
            <div style={styles.mapSection}>
              <MapView
                graficos={graficos}
                abrirGrafico={abrirGrafico}
                fecharGrafico={fecharGrafico}
                fixarGrafico={fixarGrafico}
                timeStep={timeStep}
                setTimeStep={setTimeStep}
                painelAberto={painelAberto}
                fonteDados={fonteDados}
                camadaBase={camadaBase}
                vetores={vetores}
                mostrarMalha={mostrarMalha}
              />
            </div>
          </div>
      </MainLayout>
     </>
  );
}

const styles = {
  dashboardContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    position: "relative" 
  },
  mapSection: {
    flexGrow: 1,
    width: "100%",
    height: "100%", 
    position: "relative",
    overflow: "hidden"
  }
};

export default App;