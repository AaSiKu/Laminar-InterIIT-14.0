import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GlobalContextProvider } from "./components/context.jsx";
import { ReactFlowProvider } from "@xyflow/react";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

const container = document.getElementById("root");

const root = createRoot(container);
root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReactFlowProvider>
        <GlobalContextProvider>
          <App />
        </GlobalContextProvider>
      </ReactFlowProvider>
    </ThemeProvider>
  </StrictMode>
);
