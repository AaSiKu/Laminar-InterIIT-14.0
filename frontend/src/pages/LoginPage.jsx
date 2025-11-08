import React, { useState, useContext } from "react";
import { Box, Container, TextField, Button, Typography, Alert, Paper } from "@mui/material";
import { AuthContext } from "../context/AuthContext";
import { useGlobalContext } from "../context/GlobalContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const {login,isAuthenticated} = useGlobalContext();

  if (isAuthenticated) {
    return <Typography sx={{ mt: 10, textAlign: "center" }}>Already logged in</Typography>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        mode: "cors",
        credentials:"include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
      login(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #fff 0%, #b5b5c5ff 100%)",
        p: 2,
        width:"100vw"
      }}
    >
      <Paper elevation={10} sx={{ p: 4, maxWidth: 400, width: "100%", borderRadius: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: "center" }}>
          Sign In
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ py: 1.5, fontWeight: 600, fontSize: 16 }}>
            Sign In
          </Button>
        </Box>
        <Typography sx={{ mt: 2, textAlign: "center", color: "gray" }}>
          Don't have an account?{" "}
          <a href="/auth/signup" style={{ color: "#764ba2", textDecoration: "none", fontWeight: 500 }}>
            Sign Up
          </a>
        </Typography>
      </Paper>
    </Box>
  );
}
