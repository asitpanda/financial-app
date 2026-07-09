import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '../api/auth';
import { LoginDto, RegisterDto } from '../types';
import { useAuthStore } from '../store/authStore';

export const useLogin = () => {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  
  const mutation = useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
  });

  useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      setCredentials(mutation.data);
    }
  }, [mutation.isSuccess, mutation.data, setCredentials]);

  return mutation;
};

export const useRegister = () => {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  
  const mutation = useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
  });

  useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      setCredentials(mutation.data);
    }
  }, [mutation.isSuccess, mutation.data, setCredentials]);

  return mutation;
};

export const useGetMe = () => {
  const setUser = useAuthStore((state) => state.setUser);
  
  const query = useQuery({
    queryKey: ['user'],
    queryFn: authApi.getMe,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    }
  }, [query.isSuccess, query.data, setUser]);

  return query;
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  
  return () => {
    authApi.logout();
    logout();
  };
};
