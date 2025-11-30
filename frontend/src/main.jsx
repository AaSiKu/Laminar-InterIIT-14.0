import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GlobalContextProvider } from "./context/GlobalContext.jsx";
import { ReactFlowProvider } from "@xyflow/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import MobileViewBlocker from "./components/MobileViewBlocker.jsx";

const container = document.getElementById("root");

const root = createRoot(container);
root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReactFlowProvider>
        <BrowserRouter>
          <AuthProvider>
            <GlobalContextProvider>
              <MobileViewBlocker>
                <App />
              </MobileViewBlocker>
            </GlobalContextProvider>
          </AuthProvider>
        </BrowserRouter>
      </ReactFlowProvider>
    </ThemeProvider>
  </StrictMode>
);
