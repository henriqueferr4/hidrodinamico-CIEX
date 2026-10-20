import Header from "../components/Header";
import PainelControle, { LARGURA_PAINEL, LARGURA_TRILHO } from "../components/PainelControle";
import { Box, Toolbar } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

export default function MainLayout({ children, painel }) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const larguraPainel = painel.open ? LARGURA_PAINEL : LARGURA_TRILHO;

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw" }}>

      <Header />

      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden", position: "relative" }}>

      <Box
            sx={{
            width: isMobile ? 0 : larguraPainel,
            flexShrink: 0,
            height: "100%",
            pt: "64px",
            transition: "width 0.3s"
          }}
        >
        <PainelControle {...painel} />
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <Toolbar />

        <Box
          sx={{
            flexGrow: 1,
            position: "relative",
            overflow: "hidden",

          }}
        >
          {children}
        </Box>

      </Box>
      </Box>

    </Box>
  );
}
