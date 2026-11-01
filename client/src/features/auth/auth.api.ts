import apiClient from '../../api/client';
import { AuthResponse, CurrentUser, LoginDto, RegisterDto } from './auth.types';

export const authApi = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  getMe: async (signal?: AbortSignal): Promise<CurrentUser> => {
    const response = await apiClient.get('/auth/me', {
      signal,
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
    });
    return response.data;
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },
};

export default authApi;
