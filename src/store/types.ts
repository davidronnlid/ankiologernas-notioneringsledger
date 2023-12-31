import { WeekData } from "@/types";

export interface User {
  username?: string;
  id: string;
  email?: string;
  full_name: string;
  profile_pic?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface RootState {
  auth: AuthState;
  comments: any;
  lectures: { lectures: WeekData[] };
}
