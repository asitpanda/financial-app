import React, { useState } from "react";
import { Box, Card, CardContent, Tabs, Tab, Typography } from "@mui/material";
import { authApi } from "./auth.api";
import { parseApiErrorMessages } from "../../utils/apiError";
import { useAuth } from "./useAuth";
import type { LoginDto, RegisterDto } from "./auth.types";
import AuthTabPanel from "./components/AuthTabPanel";
import AuthLoginForm from "./components/AuthLoginForm";
import AuthRegisterForm from "./components/AuthRegisterForm";

export default function Login() {
  const setCredentials = useAuth((state) => state.setCredentials);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setApiErrors([]);
  };

  const handleLogin = async (values: LoginDto) => {
    setApiErrors([]);
    setLoading(true);

    try {
      const response = await authApi.login(values);
      setCredentials(response);
    } catch (err: unknown) {
      setApiErrors(
        parseApiErrorMessages(err, "Login failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterDto) => {
    setApiErrors([]);
    setLoading(true);

    try {
      const response = await authApi.register({
        email: values.email,
        userId: values.userId?.trim() || undefined,
        mobile: values.mobile?.trim() || undefined,
        password: values.password,
        name: values.name?.trim() || undefined,
      });
      setCredentials(response);
    } catch (err: unknown) {
      setApiErrors(
        parseApiErrorMessages(err, "Registration failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f5f5f5",
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: "bold" }}
          >
            My Financial
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", mb: 3 }}
          >
            Track your expenses and reach your financial goals
          </Typography>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab label="Login" id="auth-tab-0" />
            <Tab label="Register" id="auth-tab-1" />
          </Tabs>

          {/* Login Tab */}
          <AuthTabPanel value={tabValue} index={0}>
            <AuthLoginForm
              loading={loading}
              apiErrors={apiErrors}
              onSubmit={handleLogin}
            />
          </AuthTabPanel>

          {/* Register Tab */}
          <AuthTabPanel value={tabValue} index={1}>
            <AuthRegisterForm
              loading={loading}
              apiErrors={apiErrors}
              onSubmit={handleRegister}
            />
          </AuthTabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
