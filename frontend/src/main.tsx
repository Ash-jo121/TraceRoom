import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { TraceRoomProvider } from "./TraceRoomContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TraceRoomProvider>
        <App />
      </TraceRoomProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
