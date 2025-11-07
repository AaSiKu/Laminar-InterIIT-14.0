import React, { useState, useContext } from "react";
import { Box, Container, TextField, Button, Typography, Alert, Paper } from "@mui/material";
import { AuthContext } from "../context/AuthContext";

export default function SignupPage() {
  const { login, isAuthenticated } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) return <Typography sx={{ mt: 10, textAlign: "center" }}>Already logged in</Typography>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));

      // Auto-login after signup
      const loginRes = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      login(await loginRes.json());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
        p: 2,
      }}
    >
      <Paper elevation={10} sx={{ p: 4, maxWidth: 400, width: "100%", borderRadius: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: "center" }}>
          Sign Up
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            sx={{ mb: 2 }}
          />
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
            Sign Up
          </Button>
        </Box>
        <Typography sx={{ mt: 2, textAlign: "center", color: "gray" }}>
          Already have an account? <a href="/auth/login" style={{ color: "#fda085", textDecoration: "none", fontWeight: 500 }}>Sign In</a>
        </Typography>
      </Paper>
    </Box>
  );
}
