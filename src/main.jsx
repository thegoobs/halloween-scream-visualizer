import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App/App.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>,
);
