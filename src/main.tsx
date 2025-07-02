
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import FaviconGenerator from "./components/FaviconGenerator.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FaviconGenerator />
    <App />
  </StrictMode>,
);
