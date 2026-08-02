import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../../components/common/AppButton";
import LabeledTextField from "../../../components/common/LabeledTextField";
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
      <LabeledTextField
        labelText="Name"
        autoComplete="name"
        placeholder="John Doe"
        errorMessage={registerForm.formState.errors.name?.message}
        {...registerForm.register("name")}
      />
      <LabeledTextField
        labelText="Email"
        type="email"
        autoComplete="email"
        placeholder="user@example.com"
        errorMessage={registerForm.formState.errors.email?.message}
        {...registerForm.register("email")}
      />
      <LabeledTextField
        labelText="User ID (Optional)"
        placeholder="myuserid123"
        errorMessage={registerForm.formState.errors.userId?.message}
        helperText={
          registerForm.formState.errors.userId?.message ||
          "Unique identifier for login (3-30 chars)"
        }
        slotProps={{ htmlInput: { maxLength: 30 } }}
        {...registerForm.register("userId")}
      />
      <LabeledTextField
        labelText="Mobile (Optional)"
        placeholder="+1234567890"
        errorMessage={registerForm.formState.errors.mobile?.message}
        helperText={
          registerForm.formState.errors.mobile?.message ||
          "Mobile number for login (10-15 digits)"
        }
        slotProps={{ htmlInput: { maxLength: 15 } }}
        {...registerForm.register("mobile")}
      />
      <LabeledTextField
        labelText="Password"
        type="password"
        autoComplete="new-password"
        errorMessage={registerForm.formState.errors.password?.message}
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
