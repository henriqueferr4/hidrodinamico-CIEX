import { useState } from "react";
import Header from "../components/Header"; 
import Sidebar from "../components/Sidebar";
import { Box, Toolbar } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

export default function MainLayout({
  children,
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen,
  variavelAtiva,
  setVariavelAtiva,
  fonteDados,
  setFonteDados
}) {
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const drawerWidth = sidebarOpen ? 240 : 80;

  return (
    <Box sx={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      width: "100vw" }}>

      <Header drawerWidth={drawerWidth} />

      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden", position: "relative" }}>

      <Box 
            sx={{ 
            width: isMobile ? 0 : drawerWidth, 
            flexShrink: 0,
            height: "100%",
            pt: "64px" 
          }}
        >

        
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        variavelAtiva={variavelAtiva}
        setVariavelAtiva={setVariavelAtiva}
        fonteDados={fonteDados}
        setFonteDados={setFonteDados}
      />
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