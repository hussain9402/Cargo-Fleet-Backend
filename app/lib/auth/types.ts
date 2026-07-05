export type UserRole = 'manager' | 'dispatcher' | 'driver';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string | null;
  role: UserRole | null;
  google_id: string | null;
  created_at: Date;
  updated_at: Date;
};
