import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts the UI package expects the host to load (README: Plex Sans incl. 500, Plex Mono, Yrsa).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/yrsa/400.css";
import "@fontsource/yrsa/500.css";
import "@nova-caelum/ui/styles.css";
import "./app.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
