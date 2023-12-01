import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "store/types";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

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
      switch (action.payload.full_name) {
        case "Mattias Österdahl":
          profilePicUrl = "/images/mattias.png";
          break;
        case "David Rönnlid":
          profilePicUrl = "/images/david.png";
          break;
        case "Albin Lindberg":
          profilePicUrl = "/images/albin.png";
          break;
        default:
          profilePicUrl = "/images/david.png";
      }

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
