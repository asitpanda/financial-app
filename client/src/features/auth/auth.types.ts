import type { UserPreferences } from "../settings/preferences.types";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  preferences?: UserPreferences;
}

export interface CurrentUser extends User {
  preferences: UserPreferences;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  userId?: string;
  mobile?: string;
  password: string;
  name?: string;
}
