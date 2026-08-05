import { useState } from "react";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import WaterIcon from "@mui/icons-material/Water";
import WavesIcon from "@mui/icons-material/Waves";
import OpacityIcon from "@mui/icons-material/Opacity";
import TsunamiIcon from "@mui/icons-material/Tsunami";
import AirIcon from "@mui/icons-material/Air";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SouthEastIcon from "@mui/icons-material/SouthEast";
import LayersIcon from "@mui/icons-material/Layers";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";


export default function Sidebar({ activeView, setActiveView, open, setOpen, variavelAtiva, setVariavelAtiva, fonteDados, setFonteDados }) {
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const drawerWidth = isMobile ? 240 : (open ? 240 : 80);
  const effectiveOpen = isMobile ? true : open;

  const menuItems = [ { label: "Nível", value: "nivel", icon: <WaterIcon />, }, 
    { label: "Vazão", value: "vazao", icon: <SouthEastIcon />, }, 
    { label: "Salinidade", value: "salinidade", icon: <OpacityIcon />, }, 
    { label: "Corrente", value: "corrente", icon: <TsunamiIcon />, }, 
    { label: "Vento", value: "vento", icon: <AirIcon />, }, ];

  const textStyle = {
  textAlign: open ? "left" : "center",
                  transition: "opacity 0.2s",
                  whiteSpace: open ? "nowrap" : "normal",
                  fontSize: open ? "0.9rem" : "0.65rem",
                  lineHeight: 1.1,
                  color: "#ffffff",};
  
  const [openCenario1, setOpenCenario1] = useState(false);
  const [openCenario2, setOpenCenario2] = useState(false);


    return (
    <>
        {isMobile && !open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            top: 64, // ajuste conforme a altura do seu Header mobile
            left: 10,
            zIndex: (theme) => theme.zIndex.drawer + 2, // acima do próprio Drawer
            backgroundColor: "#1f2937",
            color: "#ffffff",
            width: 40,
            height: 40,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            "&:hover": { backgroundColor: "#374151" },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? open : true}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }} // melhora performance ao reabrir no mobile
        sx={{
          width: isMobile ? 0 : drawerWidth,   // não reserva espaço fixo no mobile
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? 240 : drawerWidth,  // no mobile sempre abre "expandido" (240px), já que é só overlay
            overflowX: "hidden",
            transition: "width 0.3s",
            boxSizing: "border-box",
            backgroundColor: "#1f2937",
            color: "#ffffff",
            pt: isMobile ? "56px" : "60px", // ajusta pra ficar abaixo do Header mobile
          },
        }}
      >
        <Toolbar
          sx={{ display: "flex", justifyContent: open ? "flex-end" : "center" }}
        >
          {!isMobile && (
          <IconButton onClick={() => {
                                        if (open) {
                                          setOpen(false);
                                          setOpenCenario1(false);
                                          setOpenCenario2(false);
                                        } else {
                                          setOpen(true);
                                        }
                                      }}
            sx={{
              color: "#ffffff",   
              minWidth: 40,
            }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          )}
        </Toolbar>

        <Box
          sx={{
            px: 2,
            py: 1,
            textAlign: open ? "left" : "center",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: "#ffffff",
              fontSize: open ? "1rem" : "0.7rem",
              lineHeight: 1.2,
            }}
          >
            {open ? "Previsão Hidrodinâmica" : "Previsão"}
          </Typography>
        </Box>

        <List sx={{ mt: 2 }}>
          {menuItems.map((item) => ( 
          
            <ListItemButton 
            key={item.value} 
            selected={variavelAtiva === item.value} 
            onClick={() => {
    setFonteDados("previsao");
    setVariavelAtiva(item.value);
    if (isMobile) setOpen(false);
}}
            sx={{ 
              mx: 1, 
              mb: 1, 
              borderRadius: 2,
              flexDirection: open ? "row" : "column",
              justifyContent: open ? "initial" : "center",
              alignItems: "center",
              px: 2, 
              color: "#ffffff",
              backgroundColor:
              variavelAtiva === item.value ? "#2563eb" : "transparent",

              "&:hover": {
                backgroundColor:
                  variavelAtiva === item.value ? "#1d4ed8" : "rgba(37, 99, 235, 0.15)",
              },

              }} > 
                <ListItemIcon
                sx={{
                minWidth: 0,
                mr: open ? 2 : 0,
                mb: open ? 0 : 0.7,
                justifyContent: "center",
                color: "#ffffff",
                }}>
                {item.icon}
                </ListItemIcon> 

                <ListItemText 
                primary={item.label}
                slotProps={{
                  primary: {    
                  sx: textStyle,
              },
            }}
            sx={{m:0}}
            /> 
          </ListItemButton> 

        ))}
       
        </List>
        <Box
          sx={{
            px: 2,
            py: 1,
            textAlign: open ? "left" : "center",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: "#ffffff",
              fontWeight: 600,
              fontSize: open ? "0.9rem" : "0.65rem",
            }}
          >
            {open ? "Cenários" : "Cenários"}
          </Typography>
        </Box>
        
        {/* Cenário 1 */}
        <List>
          <ListItemButton
            onClick={() => {
                        if (!open) {
                          setOpen(true);
                          setOpenCenario1(true)
                        } else {
                          setOpenCenario1(!openCenario1);
                        }
                      }}
            sx={{
              mx: 1,
              mb: 1,
              borderRadius: 2,
              flexDirection: open ? "row" : "column",
              justifyContent: open ? "initial" : "center",
              alignItems: "center",
              px: 2,
              color: "#ffffff",
              
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 0,
                mb: open ? 0 : 0.7,
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <LayersIcon />
            </ListItemIcon>

            <ListItemText
              primary="Maio 2024"
              slotProps={{
                primary: {
                  sx: {
                    textAlign: open ? "left" : "center",
                    fontSize: open ? "0.9rem" : "0.65rem",
                    color: "#ffffff",
                  },
                },
              }}
            />
            
          </ListItemButton>
          
          <Collapse in={openCenario1}>
          <List disablePadding>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.value}
                sx={{ 
                  pl: open ? 5 : 1,
                  ml: open ? 1 : 0,
                  borderRadius: 2,
                }}
                onClick={() => {
    setFonteDados("cenario1");
    setVariavelAtiva(item.value);
}}
              >
                <ListItemIcon sx={{
                  color: "#ffffff",   // cor desejada
                  minWidth: 40,
                }}>{item.icon}
              </ListItemIcon>
                <ListItemText primary={item.label}
                 slotProps={{
                primary: {
                  sx: textStyle,
                },
              }}
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
        

        {/* Cenário 2
        
          <ListItemButton
            onClick={() => {
                        if (!open) {
                          setOpen(true);
                          setOpenCenario2(true)
                        } else {
                          setOpenCenario2(!openCenario1);
                        }
                      }}
            sx={{
              mx: 1,
              mb: 1,
              borderRadius: 2,
              flexDirection: open ? "row" : "column",
              justifyContent: open ? "initial" : "center",
              alignItems: "center",
              px: 2,
              color: "#ffffff",
              bgcolor: activeView === "cenario2" ? "#a1a1a1ff" : "transparent",
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 0,
                mb: open ? 0 : 0.7,
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <LayersIcon />
            </ListItemIcon>

            <ListItemText
              primary="Cenário 2"
              slotProps={{
                primary: {
                  sx: {
                    textAlign: open ? "left" : "center",
                    fontSize: open ? "0.9rem" : "0.65rem",
                    
                  },
                },
              }}
            />
            
          </ListItemButton>
          
          <Collapse in={openCenario2}>
          <List disablePadding>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.value}
                sx={{ 
                  pl: open ? 5 : 1,
                  ml: open ? 1 : 0,
                  borderRadius: 2,
                }}
                onClick={() => {
    setFonteDados("cenario2");
    setVariavelAtiva(item.value);
}}
              >
                <ListItemIcon
                sx={{
                  color: "#ffffff",   // cor desejada
                  minWidth: 40,
                }}
                >{item.icon}</ListItemIcon>
                <ListItemText primary={item.label}
                slotProps={{
                primary: {
                sx: textStyle,
                  
                },
              }}
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse> */}
        </List>

        {/* Rodapé com botão discreto */}
        <Box sx={{ mt: "auto", p: 1 }}>
          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mb: 1 }} />
          
          <ListItemButton
            selected={variavelAtiva === "malha"}
            onClick={() => {
              setVariavelAtiva("malha");
            }}
            sx={{
              borderRadius: 2,
              flexDirection: open ? "row" : "column",
              justifyContent: open ? "flex-start" : "center",
              alignItems: "center",
              px: 2,
              py: 1,
              color: "#9ca3af", // Cor cinza/suave para menor destaque
              opacity: 0.8,
              transition: "all 0.2s",
              "&:hover": {
                color: "#ffffff",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                opacity: 1,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 0,
                mb: open ? 0 : 0.5,
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {/* Ícone de Triângulo */}
              <ChangeHistoryIcon sx={{ fontSize: open ? "1.2rem" : "1.1rem" }} />
            </ListItemIcon>

            <ListItemText
              primary="Malha"
              slotProps={{
                primary: {
                  sx: {
                    ...textStyle,
                    color: "inherit",
                    fontSize: open ? "0.8rem" : "0.6rem", // Fonte um pouco menor
                  },
                },
              }}
            />
          </ListItemButton>
        </Box>

      </Drawer>
    </>
  );
}