import axios from "axios";
import {
  apiCallBegan,
  apiCallFailed,
  apiCallSuccess,
} from "@/customActions/api";
import { MiddlewareAPI, Dispatch } from "redux";
import { ApiAction } from "@/types";

const api =
  ({ dispatch }: MiddlewareAPI) =>
  (next: Dispatch) =>
  async (action: ApiAction) => {
    if (action.type !== apiCallBegan.type) return next(action);

    const {
      url,
      method,
      headers,
      data,
      onStart,
      onSuccess,
      onPostSuccess,
      onError,
    } = action.payload;

    if (onStart) dispatch({ type: onStart });

    next(action);

    try {
      const res = await axios.request({
        headers,
        url,
        method,
        data,
        timeout: 5000,
      });
      const resPayload = res.data;

      dispatch(apiCallSuccess(resPayload));
      if (onSuccess) {
        dispatch({
          type: onSuccess,
          payload: resPayload,
        });
        if (onPostSuccess) {
          dispatch({
            type: onPostSuccess,
            payload: resPayload,
          });
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message;
      dispatch(apiCallFailed(errorMessage));
      if (onError) dispatch({ type: onError, payload: errorMessage });
    }
  };

export default api;
