import "./Header.css";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export default function Header({ open, drawerWidth }) {
  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        width: "100%",
        backgroundColor: "#1f2937",
        transition: "all 0.3s",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <Typography variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: "#ffffff",
              fontSize: "1.5rem",
              lineHeight: 1.2,
              flexGrow: 1 }}>
          Previsão e Monitoramento Hidrodinâmico
        </Typography>

        <Box>
          
      {/* Logos */}
      <div className="logos">
        <img src="/logo1.png" alt="logo1" />
        <img src="/logo4.png" alt="logo2" />
        <img src="/logo2.png" alt="logo3" />
        <img src="/logo3.png" alt="logo3" />
        <img src="/logo5.png" alt="logo3" />
      </div>

        </Box>
      </Toolbar>
    </AppBar>
  );
}