import { configureStore, MiddlewareArray } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import authReducer from "./slices/authReducer";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import updateCheckboxReducer from "./slices/updateCheckbox";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "checkbox"],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    checkbox: updateCheckboxReducer,
  },
  middleware: new MiddlewareArray().concat(thunk),
});

export type AppDispatch = typeof store.dispatch;

const persistor = persistStore(store);

export { store, persistor };
