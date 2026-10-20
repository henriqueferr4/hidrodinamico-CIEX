import "./Header.css";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const LOGOS = [
  { src: "/logo1.png", alt: "Logo parceiro 1" },
  { src: "/logo4.png", alt: "Logo parceiro 2" },
  { src: "/logo2.png", alt: "Logo parceiro 3" },
  { src: "/logo3.png", alt: "ProCosta RS" },
  { src: "/logo5.png", alt: "Logo parceiro 5" },
];

export default function Header() {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: "100%",
        backgroundColor: "#1f2937",
        backgroundImage: "none",
        boxShadow: "none",
        border: "none",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ px: { xs: 1.5, sm: 2, md: 3 }, gap: 2 }}>
        <Typography
          component="h1"
          noWrap
          sx={{
            flexGrow: 1,
            minWidth: 0,
            fontWeight: 700,
            color: "#ffffff",
            fontSize: { xs: "1.15rem", sm: "1.35rem", md: "1.65rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          Previsão Hidrodinâmica
        </Typography>

        {/* Logos */}
        <Box className="header-logos">
          {LOGOS.map((logo) => (
            <img key={logo.src} src={logo.src} alt={logo.alt} />
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
