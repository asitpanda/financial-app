import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import Button from '../components/common/AppButton';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../api/auth';
import { parseApiErrorMessages } from '../utils/apiError';
import type { LoginDto, RegisterDto } from '../types';
import { useAuthStore } from '../store/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, user ID, or mobile is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  userId: z.string().optional(),
  mobile: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const loginForm = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      userId: '',
      mobile: '',
      password: '',
    },
  });

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
      setApiErrors(parseApiErrorMessages(err, 'Login failed. Please try again.'));
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
      setApiErrors(parseApiErrorMessages(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            My Financial
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            Track your expenses and reach your financial goals
          </Typography>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Login" id="auth-tab-0" />
            <Tab label="Register" id="auth-tab-1" />
          </Tabs>

          {apiErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiErrors.map((message, index) => (
                <Typography key={`${message}-${index}`} variant="body2" sx={{ display: 'block' }}>
                  {message}
                </Typography>
              ))}
            </Alert>
          )}

          {/* Login Tab */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
              <TextField
                fullWidth
                label="Email, User ID, or Mobile"
                type="text"
                margin="normal"
                placeholder="demo@example.com or demo123 or +1234567890"
                error={!!loginForm.formState.errors.identifier}
                helperText={
                  loginForm.formState.errors.identifier?.message ||
                  'Enter your email, user ID, or mobile number'
                }
                {...loginForm.register('identifier')}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                autoComplete="current-password"
                error={!!loginForm.formState.errors.password}
                helperText={loginForm.formState.errors.password?.message}
                {...loginForm.register('password')}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || loginForm.formState.isSubmitting}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Try: demo@example.com / demo123 / +1234567890 with password123
              </Typography>
            </form>
          </TabPanel>

          {/* Register Tab */}
          <TabPanel value={tabValue} index={1}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} noValidate>
              <TextField
                fullWidth
                label="Name"
                margin="normal"
                autoComplete="name"
                placeholder="John Doe"
                error={!!registerForm.formState.errors.name}
                helperText={registerForm.formState.errors.name?.message}
                {...registerForm.register('name')}
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
                {...registerForm.register('email')}
              />
              <TextField
                fullWidth
                label="User ID (Optional)"
                margin="normal"
                placeholder="myuserid123"
                helperText="Unique identifier for login"
                error={!!registerForm.formState.errors.userId}
                {...registerForm.register('userId')}
              />
              <TextField
                fullWidth
                label="Mobile (Optional)"
                margin="normal"
                placeholder="+1234567890"
                helperText="Mobile number for login"
                error={!!registerForm.formState.errors.mobile}
                {...registerForm.register('mobile')}
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
                  'Minimum 6 characters'
                }
                {...registerForm.register('password')}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || registerForm.formState.isSubmitting}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Create account with email, userId, and/or mobile for login options
              </Typography>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
