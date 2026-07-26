import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../../components/common/AppButton";
import { loginSchema } from "../auth.schemas";
import type { LoginDto } from "../auth.types";

interface AuthLoginFormProps {
  loading: boolean;
  apiErrors: string[];
  onSubmit: (values: LoginDto) => Promise<void>;
}

export default function AuthLoginForm({
  loading,
  apiErrors,
  onSubmit,
}: AuthLoginFormProps) {
  const loginForm = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  return (
    <Box
      component="form"
      onSubmit={loginForm.handleSubmit(onSubmit)}
      noValidate
    >
      {apiErrors.length > 0 ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {apiErrors.map((message, index) => (
            <Typography
              key={`${message}-${index}`}
              variant="body2"
              sx={{ display: "block" }}
            >
              {message}
            </Typography>
          ))}
        </Alert>
      ) : null}
      <TextField
        fullWidth
        label="Email, User ID, or Mobile"
        type="text"
        margin="normal"
        placeholder="demo@example.com or demo123 or +1234567890"
        error={!!loginForm.formState.errors.identifier}
        helperText={
          loginForm.formState.errors.identifier?.message ||
          "Enter your email, user ID, or mobile number"
        }
        {...loginForm.register("identifier")}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        margin="normal"
        autoComplete="current-password"
        error={!!loginForm.formState.errors.password}
        helperText={loginForm.formState.errors.password?.message}
        {...loginForm.register("password")}
      />
      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="large"
        disabled={loading || loginForm.formState.isSubmitting}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Login"}
      </Button>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        Try: demo@example.com / demo123 / +1234567890 with password123
      </Typography>
    </Box>
  );
}
