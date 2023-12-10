import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "store/types";
import { getProfilePicUrl } from "utils/profilePicMapper";

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
