import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { GameApp } from "../app/components/GameApp";

const root = document.getElementById("root");

if (!root) {
  throw new Error("FableForge konnte nicht gestartet werden: Root-Element fehlt.");
}

createRoot(root).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);
