import React from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@astryxdesign/core/theme";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme theme={neutralTheme}>
      <ToastViewport position="bottomEnd" maxVisible={3}>
        <App />
      </ToastViewport>
    </Theme>
  </React.StrictMode>,
);
