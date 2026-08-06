import { useState, useEffect  } from "react";
import MainLayout from "./layout/MainLayout";
import Modal from "react-modal";
import "./components/Modal.css";
import ChartNivel from "./components/LineChartNivel";
import ChartContainer from "./components/ChartContainer";
import MapView from "./components/MapView";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

Modal.setAppElement("#root");

function App() {
  // Controla telas internas do dashboard (inicia direto em "nivel")
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [modalAberto, setModalAberto] = useState(false);
  const [activeView, setActiveView] = useState("nivel");
  const [timeStep, setTimeStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [variavelAtiva, setVariavelAtiva] = useState("nivel");
  const [fonteDados, setFonteDados] = useState("previsao");
  const [estacaoSelecionada, setEstacaoSelecionada] = useState(null);

  useEffect(() => {
    setModalAberto(true);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

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
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        variavelAtiva={variavelAtiva}
        setVariavelAtiva={setVariavelAtiva}
        fonteDados={fonteDados}
        setFonteDados={setFonteDados}
      >
        {/* DASHBOARD HIDRODINÂMICO */}
        {variavelAtiva && (
          <div style={styles.dashboardContainer}>
            <div style={styles.mapSection}>
              <MapView
                estacaoSelecionada={estacaoSelecionada}
                setEstacaoSelecionada={setEstacaoSelecionada}
                timeStep={timeStep}
                setTimeStep={setTimeStep}
                sidebarOpen={sidebarOpen}
                variavelAtiva={variavelAtiva} 
                fonteDados={fonteDados}      
              />
            </div>
          </div>
        )}
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