import { configureStore, MiddlewareArray } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import authReducer from "./slices/authReducer";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import lecturesReducer from "./slices/lecturesReducer";
import updateCheckboxReducer from "./slices/updateCheckbox";
import commentsReducer from "./slices/commentsReducer";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "checkbox", "comments", "lectures"],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    checkbox: updateCheckboxReducer,
    comments: commentsReducer,
    lectures: lecturesReducer,
  },
  middleware: new MiddlewareArray().concat(thunk),
});

export type AppDispatch = typeof store.dispatch;

const persistor = persistStore(store);

export { store, persistor };
