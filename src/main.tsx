import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import QuickAdd from "./windows/QuickAdd";
import MainApp from "./windows/main/MainApp";
import "./styles.css";

const label = getCurrentWebviewWindow().label;
document.documentElement.dataset.window = label;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {label === "quickadd" ? <QuickAdd /> : <MainApp />}
  </React.StrictMode>,
);
