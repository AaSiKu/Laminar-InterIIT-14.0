import React from "react";
import { Box } from "@mui/material";
import Logo from "../assets/logo.svg";
import "../css/loading.css";

const Loading = () => {
  return (
    <Box className="loading-container">
      <Box className="loading-content">
        <img src={Logo} alt="Laminar Logo" className="loading-logo" />
        <Box className="loading-bar-track">
          <Box className="loading-bar-indicator" />
        </Box>
      </Box>
    </Box>
  );
};

export default Loading;

