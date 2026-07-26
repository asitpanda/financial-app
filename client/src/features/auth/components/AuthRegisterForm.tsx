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
import { registerSchema } from "../auth.schemas";
import type { RegisterDto } from "../auth.types";

interface AuthRegisterFormProps {
  loading: boolean;
  apiErrors: string[];
  onSubmit: (values: RegisterDto) => Promise<void>;
}

export default function AuthRegisterForm({
  loading,
  apiErrors,
  onSubmit,
}: AuthRegisterFormProps) {
  const registerForm = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      userId: "",
      mobile: "",
      password: "",
    },
  });

  return (
    <Box
      component="form"
      onSubmit={registerForm.handleSubmit(onSubmit)}
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
        label="Name"
        margin="normal"
        autoComplete="name"
        placeholder="John Doe"
        error={!!registerForm.formState.errors.name}
        helperText={registerForm.formState.errors.name?.message}
        {...registerForm.register("name")}
      />
      <TextField
        fullWidth
        label="Email"
        type="email"
        margin="normal"
        autoComplete="email"
        placeholder="user@example.com"
        error={!!registerForm.formState.errors.email}
        helperText={registerForm.formState.errors.email?.message}
        {...registerForm.register("email")}
      />
      <TextField
        fullWidth
        label="User ID (Optional)"
        margin="normal"
        placeholder="myuserid123"
        helperText="Unique identifier for login"
        error={!!registerForm.formState.errors.userId}
        {...registerForm.register("userId")}
      />
      <TextField
        fullWidth
        label="Mobile (Optional)"
        margin="normal"
        placeholder="+1234567890"
        helperText="Mobile number for login"
        error={!!registerForm.formState.errors.mobile}
        {...registerForm.register("mobile")}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        margin="normal"
        autoComplete="new-password"
        error={!!registerForm.formState.errors.password}
        helperText={
          registerForm.formState.errors.password?.message ||
          "Minimum 6 characters"
        }
        {...registerForm.register("password")}
      />
      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="large"
        disabled={loading || registerForm.formState.isSubmitting}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Register"}
      </Button>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        Create account with email, userId, and/or mobile for login options
      </Typography>
    </Box>
  );
}
