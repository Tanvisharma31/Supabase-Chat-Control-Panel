import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "../../../packages/ui/src/theme.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
