export const SIGN_IN = "SIGN_IN";
export const SIGN_OUT = "SIGN_OUT";

export const signIn = (user: any) => ({
  type: SIGN_IN,
  payload: user,
});

export const signOut = () => ({
  type: SIGN_OUT,
});
