interface User {
  username?: string;
  full_name: string;
  id: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface RootState {
  auth: AuthState;
}
