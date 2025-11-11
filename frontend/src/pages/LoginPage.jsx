import React, { useState, useContext } from "react";
import { Box, TextField, Button, Typography, Alert, Paper } from "@mui/material";
// Assuming useGlobalContext provides the same shape as AuthContext
import { useGlobalContext } from "../context/GlobalContext"; 
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login'; // Icon for the login header

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Using useGlobalContext as per your provided snippet
  const { login, isAuthenticated } = useGlobalContext(); 

  if (isAuthenticated) {
    return <Typography sx={{ mt: 10, textAlign: "center" }}>Already logged in</Typography>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
      login(data);
    } catch (err) {
      setError(err.message);
    }
    finally{
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw", // Ensured minWidth is set
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5", // Changed to light grey background
        position: "relative",
        overflow: "hidden",
        p: 2,
      }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 5, 
          maxWidth: 480, 
          width: "100%", 
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header with Icon */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            <LoginIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              textAlign: "center",
              color: 'text.primary',
              letterSpacing: '-0.5px',
            }}
          >
            Sign In
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: "center",
              color: 'text.secondary',
              mt: 1,
            }}
          >
            Welcome back! Please sign in to your account.
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: '12px',
              '& .MuiAlert-icon': {
                fontSize: '24px',
              }
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Email Field */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
              Email Address
            </Typography>
            <TextField
              required
              fullWidth
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                  },
                  '&.Mui-focused': {
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                  },
                },
              }}
            />
          </Box>

          {/* Password Field */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
              Password
            </Typography>
            <TextField
              required
              fullWidth
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <LockIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                  },
                  '&.Mui-focused': {
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                  },
                },
              }}
            />
          </Box>

          {/* Submit Button */}
          <Button 
            type="submit" 
            fullWidth 
            variant="contained"
            sx={{ 
              py: 1.8, 
              fontWeight: 700, 
              fontSize: 16,
              borderRadius: '12px',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                transition: 'left 0.5s ease',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 30px rgba(59, 130, 246, 0.5)',
                '&::before': {
                  left: '100%',
                },
              },
              '&:active': {
                transform: 'translateY(0px)',
              },
            }}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </Box>

        {/* Sign Up Link */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Typography sx={{ textAlign: "center", color: 'text.secondary', fontSize: '0.95rem' }}>
            Don't have an account?{' '}
            <a 
              href="/auth/signup" 
              style={{ 
                color: '#3b82f6', 
                textDecoration: 'none', 
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.color = '#2563eb'}
              onMouseLeave={(e) => e.target.style.color = '#3b82f6'}
            >
              Sign Up
            </a>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}