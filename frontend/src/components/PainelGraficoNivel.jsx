import { useEffect, useState, forwardRef } from "react";
import ChartNivel, { SENSOR_POR_ID, caminhoHistorico } from "./LineChartNivel";
import "./PainelGraficoNivel.css";

const AZUL = "#2A3D59";
const CINZA = "#718096";
const DIAS_HISTORICO = 5;

// Diferença observado − previsto: negativa = previsão acima do observado (errou para mais),
// positiva = previsão abaixo do observado (errou para menos)
const COR_ERRO = {
  paraMais: { texto: "#A16207", fundo: "rgba(250, 204, 21, 0.28)" },
  paraMenos: { texto: "#C2410C", fundo: "rgba(255, 115, 0, 0.18)" }
};

const temValor = (v) => v !== null && v !== undefined && !Number.isNaN(v);
const pad = (n) => String(n).padStart(2, "0");

const formatarDataHora = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Últimos N dias antes de hoje, no formato da pasta do histórico (AAAAMMDD)
function ultimosDias(n) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (i + 1));
    return {
      id: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
      curto: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
      completo: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      semana: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
    };
  });
}

function TituloSecao({ children }) {
  return (
    <div
      style={{
        fontSize: "12.5px",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: CINZA,
        margin: "14px 4px 8px"
      }}
    >
      {children}
    </div>
  );
}

/* ==================== TABELA ==================== */

function TabelaNivel({ dados }) {
  const linhas = dados.filter((d) => temValor(d.previsao));

  if (!linhas.length) return null;

  const celula = { padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" };
  const cabecalho = {
    ...celula,
    position: "sticky",
    top: 0,
    background: "#EEF1F5",
    color: AZUL,
    fontWeight: "700",
    fontSize: "12.5px",
    zIndex: 1
  };

  return (
    <>
      <div
        className="rolagem-discreta"
        style={{
          maxHeight: "220px",
          overflowY: "auto",
          borderRadius: "10px",
          border: "1px solid rgba(42, 61, 89, 0.12)",
          background: "rgba(255, 255, 255, 0.7)"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", color: AZUL }}>
          <thead>
            <tr>
              <th style={{ ...cabecalho, textAlign: "left" }}>Data/hora</th>
              <th style={cabecalho}>Previsto (cm)</th>
              <th style={cabecalho}>Observado (cm)</th>
              <th style={cabecalho}>Diferença (cm)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((d, i) => {
              const observado = temValor(d.observado) ? d.observado : null;
              const diferenca = observado !== null ? Number((observado - d.previsao).toFixed(1)) : null;
              const erro =
                diferenca === null || diferenca === 0
                  ? null
                  : diferenca < 0
                  ? COR_ERRO.paraMais
                  : COR_ERRO.paraMenos;

              return (
                <tr key={d.timestamp} style={{ background: i % 2 ? "rgba(42, 61, 89, 0.03)" : "transparent" }}>
                  <td style={{ ...celula, textAlign: "left", fontWeight: "700" }}>{formatarDataHora(d.timestamp)}</td>
                  <td style={{ ...celula, fontWeight: "600" }}>{d.previsao.toFixed(1)}</td>
                  <td style={{ ...celula, color: observado === null ? CINZA : AZUL }}>
                    {observado === null ? "-" : observado.toFixed(1)}
                  </td>
                  <td style={celula}>
                    {diferenca === null ? (
                      <span style={{ color: CINZA }}>-</span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: "48px",
                          padding: "1px 8px",
                          borderRadius: "999px",
                          fontWeight: "700",
                          color: erro ? erro.texto : AZUL,
                          background: erro ? erro.fundo : "transparent"
                        }}
                      >
                        {diferenca > 0 ? `+${diferenca}` : diferenca}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}

/* ==================== HISTÓRICO ==================== */

// Espaço extra do bloco do histórico: data da previsão + padding
const ALTURA_CABECALHO_HISTORICO = 40;

function HistoricoPrevisoes({ estacao, alturaGrafico }) {
  const nomeSensor = SENSOR_POR_ID[estacao.id];
  const dias = useState(() => ultimosDias(DIAS_HISTORICO))[0];
  const [disponiveis, setDisponiveis] = useState({});
  const [selecionado, setSelecionado] = useState(null);

  // Verifica quais dias têm previsão salva para esta estação
  useEffect(() => {
    setSelecionado(null);
    if (!nomeSensor) return;
    const controller = new AbortController();
    Promise.all(
      dias.map((d) =>
        fetch(caminhoHistorico(nomeSensor, d.id), { method: "HEAD", signal: controller.signal })
          .then((res) => [d.id, res.ok])
          .catch(() => [d.id, false])
      )
    ).then((resultado) => {
      if (!controller.signal.aborted) setDisponiveis(Object.fromEntries(resultado));
    });
    return () => controller.abort();
  }, [nomeSensor, dias]);

  const dia = dias.find((d) => d.id === selecionado);

  return (
    <>
      <TituloSecao>Histórico de previsões</TituloSecao>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${DIAS_HISTORICO}, 1fr)`, gap: "6px" }}>
        {dias.map((d) => {
          const disponivel = disponiveis[d.id];
          const ativo = selecionado === d.id;
          return (
            <button
              key={d.id}
              type="button"
              disabled={!disponivel}
              aria-pressed={ativo}
              title={disponivel === false ? "Previsão indisponível" : `Previsão de ${d.completo}`}
              onClick={() => setSelecionado(ativo ? null : d.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1px",
                padding: "6px 4px",
                borderRadius: "8px",
                border: `1px solid ${ativo ? AZUL : "rgba(42, 61, 89, 0.15)"}`,
                background: ativo ? AZUL : "rgba(255, 255, 255, 0.7)",
                color: ativo ? "#ffffff" : AZUL,
                opacity: disponivel ? 1 : 0.4,
                cursor: disponivel ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "capitalize", opacity: 0.8 }}>{d.semana}</span>
              <span style={{ fontSize: "14px", fontWeight: "700" }}>{d.curto}</span>
            </button>
          );
        })}
      </div>

      {dia && (
        <div
          style={{
            height: `${alturaGrafico + ALTURA_CABECALHO_HISTORICO}px`,
            marginTop: "10px",
            padding: "8px",
            borderRadius: "10px",
            border: "1px solid rgba(42, 61, 89, 0.12)",
            background: "rgba(255, 255, 255, 0.7)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}
        >
          {/* Só a data: a estação já aparece no cabeçalho do pop-up */}
          <span
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: CINZA,
              fontWeight: "600",
              padding: "0 4px",
              lineHeight: "20px",
              flexShrink: 0
            }}
          >
            Previsão de {dia.completo}
          </span>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChartNivel
              key={dia.id}
              estacaoSelecionada={estacao}
              dataHistorico={dia.id}
              titulo={`Previsão de ${dia.completo}`}
              ocultarCabecalho
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ==================== PAINEL ==================== */

/**
 * Conteúdo do pop-up de nível: gráfico da previsão atual, tabela com os mesmos
 * dados e, rolando para baixo, o histórico de previsões dos últimos dias.
 * O ref é repassado ao gráfico principal (download em PNG).
 */
const PainelGraficoNivel = forwardRef(function PainelGraficoNivel(
  { estacaoSelecionada, titulo, alturaGrafico, acoes, isMobile },
  ref
) {
  const [dados, setDados] = useState([]);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  return (
    <>
    {/* Cabeçalho fixo: estação, título, atualização e botões */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
        padding: "0 4px 6px",
        flexShrink: 0
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "700", color: AZUL, lineHeight: 1.2 }}>
          {estacaoSelecionada.nome}
        </span>
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: CINZA,
            fontWeight: "600"
          }}
        >
          {titulo}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", flexShrink: 0 }}>
        {atualizadoEm && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              padding: "2px 10px",
              borderRadius: "999px",
              // destaque em "pílula" no azul da ferramenta
              color: AZUL,
              background: "rgba(42, 61, 89, 0.1)",
              whiteSpace: "nowrap"
            }}
          >
            {atualizadoEm}
          </span>
        )}
        {acoes}
      </div>
    </div>

    <div
      className="rolagem-discreta"
      style={{
        flexGrow: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        paddingRight: "6px"
      }}
    >
      <div style={{ height: `${alturaGrafico}px` }}>
        <ChartNivel
          ref={ref}
          estacaoSelecionada={estacaoSelecionada}
          titulo={titulo}
          ocultarCabecalho
          onDados={setDados}
          onAtualizadoEm={setAtualizadoEm}
        />
      </div>

      {dados.some((d) => temValor(d.previsao)) && (
        <>
          <TituloSecao>Previsto × observado</TituloSecao>
          <TabelaNivel dados={dados} />
        </>
      )}

      <HistoricoPrevisoes estacao={estacaoSelecionada} alturaGrafico={alturaGrafico} />
      <div style={{ height: "6px" }} />
    </div>
    </>
  );
});

export default PainelGraficoNivel;
