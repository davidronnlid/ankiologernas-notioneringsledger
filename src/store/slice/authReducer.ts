import { SIGN_IN, SIGN_OUT } from "../customActions/authActions";

const initialState = {
  isAuthenticated: false,
  user: null,
};

const authReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case SIGN_IN:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
      };
    case SIGN_OUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      };
    default:
      return state;
  }
};

export default authReducer;
