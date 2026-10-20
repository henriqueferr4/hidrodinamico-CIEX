import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import { useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import WaterIcon from "@mui/icons-material/Water";
import TsunamiIcon from "@mui/icons-material/Tsunami";
import AirIcon from "@mui/icons-material/Air";
import SouthEastIcon from "@mui/icons-material/SouthEast";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { IconeSeta } from "./LegendaMapa";
import {
  CAMADAS_BASE,
  CAMADAS_VETORES,
  COR_SETA,
  FUNDO_AMOSTRA_SETA,
  CENARIOS,
  ehCenario
} from "./layers/camadas";

export const LARGURA_PAINEL = 288;
export const LARGURA_TRILHO = 64;

const COR = {
  fundo: "#1f2937",
  superficie: "rgba(255, 255, 255, 0.04)",
  borda: "rgba(255, 255, 255, 0.08)",
  texto: "#f9fafb",
  textoSuave: "#9ca3af",
  // Seleção discreta, em tons de cinza
  selecionado: "rgba(255, 255, 255, 0.12)",
  selecionadoBorda: "rgba(255, 255, 255, 0.28)",
  selecionadoIcone: "rgba(255, 255, 255, 0.18)",
  indicador: "#e5e7eb"
};

const ICONES_BASE = {
  nivel: WaterIcon,
  corrente: TsunamiIcon,
  vento: AirIcon,
  vazao: SouthEastIcon
};

const estiloSwitch = {
  "& .MuiSwitch-switchBase": { color: COR.textoSuave },
  "& .MuiSwitch-switchBase.Mui-checked": { color: "#ffffff" },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#6b7280",
    opacity: 1
  },
  "& .MuiSwitch-track": { backgroundColor: "#374151", opacity: 1 }
};

const fonteTema = (t) => t.typography.fontFamily;

/* ==================== BLOCOS DO PAINEL ==================== */

function Secao({ titulo, children }) {
  return (
    <Box component="section" sx={{ px: 2, pt: 2.5 }}>
      <Typography
        component="h2"
        sx={{
          mb: 1,
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: COR.textoSuave
        }}
      >
        {titulo}
      </Typography>
      {children}
    </Box>
  );
}

function BotaoAba({ ativo, onClick, children, ...props }) {
  return (
    <ButtonBase
      onClick={onClick}
      {...props}
      sx={{
        py: 0.9,
        borderRadius: 1.5,
        fontSize: "0.8rem",
        fontWeight: 600,
        fontFamily: fonteTema,
        color: ativo ? COR.texto : COR.textoSuave,
        backgroundColor: ativo ? COR.selecionado : "transparent",
        transition: "all 0.2s",
        "&:hover": { color: COR.texto }
      }}
    >
      {children}
    </ButtonBase>
  );
}

function SeletorFonte({ fonteDados, setFonteDados }) {
  const cenarioAtivo = ehCenario(fonteDados);
  // A lista abre ao clicar em "Cenários"; os dados só mudam ao escolher um cenário
  const [listaAberta, setListaAberta] = useState(cenarioAtivo);
  const abaCenarios = listaAberta || cenarioAtivo;

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0.5,
          p: 0.5,
          borderRadius: 2,
          backgroundColor: "rgba(0, 0, 0, 0.25)"
        }}
      >
        <BotaoAba
          ativo={!abaCenarios}
          aria-pressed={!abaCenarios}
          onClick={() => {
            setListaAberta(false);
            setFonteDados("previsao");
          }}
        >
          Previsão
        </BotaoAba>
        <BotaoAba
          ativo={abaCenarios}
          aria-expanded={abaCenarios}
          onClick={() => setListaAberta(true)}
        >
          Cenários
        </BotaoAba>
      </Box>

      <Collapse in={abaCenarios}>
        <Box role="radiogroup" aria-label="Cenários" sx={{ pt: 1 }}>
          {CENARIOS.map((c) => {
            const ativo = fonteDados === c.id;
            return (
              <ButtonBase
                key={c.id}
                role="radio"
                aria-checked={ativo}
                onClick={() => setFonteDados(c.id)}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  textAlign: "left",
                  fontFamily: fonteTema,
                  border: `1px solid ${ativo ? COR.selecionadoBorda : COR.borda}`,
                  backgroundColor: ativo ? COR.selecionado : COR.superficie,
                  transition: "all 0.2s",
                  "&:hover": { backgroundColor: ativo ? COR.selecionado : "rgba(255, 255, 255, 0.08)" }
                }}
              >
                <Typography sx={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, color: COR.texto }}>
                  {c.rotulo}
                </Typography>
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${ativo ? COR.indicador : "#4b5563"}`,
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  {ativo && <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: COR.indicador }} />}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </Collapse>
    </>
  );
}

function OpcaoBase({ camada, ativo, onClick, desabilitado }) {
  const Icone = ICONES_BASE[camada.id];
  return (
    <ButtonBase
      role="radio"
      aria-checked={ativo}
      disabled={desabilitado}
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1,
        mb: 0.75,
        borderRadius: 2,
        textAlign: "left",
        fontFamily: fonteTema,
        border: `1px solid ${ativo ? COR.selecionadoBorda : COR.borda}`,
        backgroundColor: ativo ? COR.selecionado : COR.superficie,
        opacity: desabilitado ? 0.4 : 1,
        transition: "all 0.2s",
        "&:hover": {
          backgroundColor: ativo ? COR.selecionado : "rgba(255, 255, 255, 0.08)"
        }
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: 1.5,
          color: COR.texto,
          backgroundColor: ativo ? COR.selecionadoIcone : "rgba(255, 255, 255, 0.06)",
          transition: "all 0.2s"
        }}
      >
        <Icone sx={{ fontSize: 19 }} />
      </Box>

      <Typography sx={{ flex: 1, fontSize: "0.88rem", fontWeight: 600, color: COR.texto }}>
        {camada.rotulo}
      </Typography>

      {/* Indicador de rádio */}
      <Box
        sx={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: "50%",
          border: `2px solid ${ativo ? COR.indicador : "#4b5563"}`,
          display: "grid",
          placeItems: "center",
          transition: "border-color 0.2s"
        }}
      >
        {ativo && <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COR.indicador }} />}
      </Box>
    </ButtonBase>
  );
}

function LinhaSwitch({ rotulo, amostra, ativo, onChange }) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1,
        py: 0.5,
        mb: 0.5,
        borderRadius: 2,
        cursor: "pointer",
        transition: "background-color 0.2s",
        "&:hover": { backgroundColor: COR.superficie }
      }}
    >
      <Box sx={{ width: 32, display: "grid", placeItems: "center", flexShrink: 0 }}>{amostra}</Box>
      <Typography sx={{ flex: 1, fontSize: "0.86rem", fontWeight: 500, color: COR.texto }}>
        {rotulo}
      </Typography>
      <Switch
        size="small"
        checked={ativo}
        onChange={(e) => onChange(e.target.checked)}
        sx={estiloSwitch}
      />
    </Box>
  );
}

function AmostraSeta({ tipo }) {
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: 1,
        display: "grid",
        placeItems: "center",
        backgroundColor: FUNDO_AMOSTRA_SETA
      }}
    >
      <IconeSeta cor={COR_SETA[tipo]} tamanho={13} />
    </Box>
  );
}

/* ==================== TRILHO (PAINEL RECOLHIDO) ==================== */

function BotaoTrilho({ titulo, ativo, onClick, children, desabilitado }) {
  return (
    <Tooltip title={titulo} placement="right" arrow>
      <span>
        <IconButton
          onClick={onClick}
          disabled={desabilitado}
          aria-label={titulo}
          aria-pressed={ativo}
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            color: COR.texto,
            backgroundColor: ativo ? COR.selecionadoIcone : "transparent",
            "&:hover": { backgroundColor: ativo ? COR.selecionadoIcone : "rgba(255, 255, 255, 0.08)" },
            "&.Mui-disabled": { color: "#4b5563" }
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function Trilho({ setOpen, camadaBase, alternarBase, vetores, setVetor, cenario }) {
  const separador = <Box sx={{ width: 28, height: "1px", my: 1, backgroundColor: COR.borda }} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, pt: 1.5 }}>
      <BotaoTrilho titulo="Abrir painel de camadas" onClick={() => setOpen(true)}>
        <ChevronRightIcon />
      </BotaoTrilho>

      {separador}

      {CAMADAS_BASE.map((c) => {
        const Icone = ICONES_BASE[c.id];
        return (
          <BotaoTrilho
            key={c.id}
            titulo={c.rotulo}
            ativo={camadaBase === c.id}
            desabilitado={c.somentePrevisao && cenario}
            onClick={() => alternarBase(c.id)}
          >
            <Icone fontSize="small" />
          </BotaoTrilho>
        );
      })}

      {separador}

      {CAMADAS_VETORES.map((v) => (
        <BotaoTrilho
          key={v.id}
          titulo={`Vetores de ${v.rotulo.toLowerCase()}`}
          ativo={vetores[v.id]}
          onClick={() => setVetor(v.id, !vetores[v.id])}
        >
          <AmostraSeta tipo={v.id} />
        </BotaoTrilho>
      ))}
    </Box>
  );
}

/* ==================== PAINEL ==================== */

export default function PainelControle({
  open,
  setOpen,
  fonteDados,
  setFonteDados,
  camadaBase,
  setCamadaBase,
  vetores,
  setVetores,
  mostrarMalha,
  setMostrarMalha
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const expandido = isMobile || open;
  const largura = expandido ? LARGURA_PAINEL : LARGURA_TRILHO;
  const cenario = ehCenario(fonteDados);

  // Só uma camada base por vez: escolher outra desativa a anterior
  const alternarBase = (id) => setCamadaBase(id);
  const setVetor = (id, ativo) => setVetores((v) => ({ ...v, [id]: ativo }));

  const conteudo = (
    <>
      {/* Cabeçalho */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pt: 2 }}>
        <Typography sx={{ flex: 1, fontSize: "0.95rem", fontWeight: 700, color: COR.texto }}>
          Painel de camadas
        </Typography>
        <IconButton
          size="small"
          onClick={() => setOpen(false)}
          aria-label="Recolher painel"
          sx={{ color: COR.textoSuave, "&:hover": { color: COR.texto, backgroundColor: "rgba(255,255,255,0.08)" } }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      </Box>

      <Secao titulo="Natureza dos dados">
        <SeletorFonte fonteDados={fonteDados} setFonteDados={setFonteDados} />
      </Secao>

      <Secao titulo="Camada base">
        <Box role="radiogroup" aria-label="Camada base">
          {CAMADAS_BASE.map((c) => (
            <OpcaoBase
              key={c.id}
              camada={c}
              ativo={camadaBase === c.id}
              desabilitado={c.somentePrevisao && cenario}
              onClick={() => alternarBase(c.id)}
            />
          ))}
        </Box>
      </Secao>

      <Secao titulo="Vetores">
        {CAMADAS_VETORES.map((v) => (
          <LinhaSwitch
            key={v.id}
            rotulo={v.rotulo}
            amostra={<AmostraSeta tipo={v.id} />}
            ativo={vetores[v.id]}
            onChange={(ativo) => setVetor(v.id, ativo)}
          />
        ))}
      </Secao>

      {/* Rodapé */}
      <Box sx={{ mt: "auto", px: 2, pt: 2.5, pb: 1.5 }}>
        <Box sx={{ height: "1px", backgroundColor: COR.borda, mb: 1 }} />
        <LinhaSwitch
          rotulo="Malha"
          amostra={<ChangeHistoryIcon sx={{ fontSize: 18, color: COR.textoSuave }} />}
          ativo={mostrarMalha}
          onChange={setMostrarMalha}
        />
      </Box>
    </>
  );

  return (
    <>
      {isMobile && !open && (
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="Abrir painel de camadas"
          sx={{
            position: "fixed",
            top: 64,
            left: 10,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            backgroundColor: COR.fundo,
            color: "#ffffff",
            width: 40,
            height: 40,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            "&:hover": { backgroundColor: "#374151" }
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? open : true}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? 0 : largura,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: largura,
            overflowX: "hidden",
            transition: "width 0.3s",
            boxSizing: "border-box",
            backgroundColor: COR.fundo,
            backgroundImage: "none",
            color: COR.texto,
            border: "none",
            pt: isMobile ? "56px" : "64px",
            display: "flex",
            flexDirection: "column"
          }
        }}
      >
        {expandido ? (
          conteudo
        ) : (
          <Trilho
            setOpen={setOpen}
            camadaBase={camadaBase}
            alternarBase={alternarBase}
            vetores={vetores}
            setVetor={setVetor}
            cenario={cenario}
          />
        )}
      </Drawer>
    </>
  );
}
