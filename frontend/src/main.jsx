import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GlobalContextProvider } from "./components/context.jsx";
import { ReactFlowProvider } from "@xyflow/react";

const container = document.getElementById("root");

const root = createRoot(container);
root.render(
  <StrictMode>
    <ReactFlowProvider>
      <GlobalContextProvider>
        <App />
      </GlobalContextProvider>
    </ReactFlowProvider>
  </StrictMode>
);
