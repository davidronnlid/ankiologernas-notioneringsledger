interface User {
  username?: string;
  // other fields if you have any...
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface RootState {
  auth: AuthState;
}
