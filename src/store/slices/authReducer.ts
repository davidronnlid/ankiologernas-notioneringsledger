import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "store/types";
import { getProfilePicUrl } from "utils/profilePicMapper";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

// Development user for local testing
const developmentUser: User = {
  id: "david-ronnlid-123",
  email: "david.ronnlid@example.com",
  full_name: "David Rönnlid",
  profile_pic: "/images/david.png",
};

// Safe initial state for SSR compatibility
// Always start with non-authenticated state to prevent hydration mismatches
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<User>) => {
      console.log("User payload set to state:", action.payload);

      // Assign a profile picture based on the user's full name
      let profilePicUrl;
      profilePicUrl = getProfilePicUrl(action.payload.full_name);

      state.isAuthenticated = true;
      state.user = {
        ...action.payload,
        profile_pic: profilePicUrl,
      };
    },
    signOut: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

// Action to initialize development user safely (client-side only)
export const initializeDevelopmentUser = () => (dispatch: any) => {
  // Only auto-login in development and on client-side
  if (typeof window !== 'undefined' && process.env.NODE_ENV === "development") {
    dispatch(signIn(developmentUser));
  }
};

export const { signIn, signOut } = authSlice.actions;

export default authSlice.reducer;
