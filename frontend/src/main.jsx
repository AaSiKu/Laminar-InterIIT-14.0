import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GlobalContextProvider } from "./components/context.jsx";
import { ReactFlowProvider } from "@xyflow/react";
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'

const container = document.getElementById('root')

const root = createRoot(container)
root.render(
  <StrictMode>
    
        <ReactFlowProvider>
      <GlobalContextProvider>
        <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
      </GlobalContextProvider>
    </ReactFlowProvider>
  </StrictMode>
);
