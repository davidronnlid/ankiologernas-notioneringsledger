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

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

const initialState: AuthState = {
  isAuthenticated: isDevelopment,
  user: isDevelopment ? developmentUser : null,
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

export const { signIn, signOut } = authSlice.actions;

export default authSlice.reducer;
