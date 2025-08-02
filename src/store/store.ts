import { configureStore, MiddlewareArray } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import authReducer from "./slices/authReducer";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import lecturesReducer from "./slices/lecturesReducer";
import updateCheckboxReducer from "./slices/updateCheckbox";
import commentsReducer from "./slices/commentsReducer";
import notificationsReducer from "./slices/notificationsReducer";

const persistConfig = {
  key: "root",
  storage: safeStorage,
  whitelist: ["auth", "checkbox", "comments", "lectures", "notifications"],
  serialize: false, // Improve performance
  deserialize: false, // Improve performance
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    checkbox: updateCheckboxReducer,
    comments: commentsReducer,
    lectures: lecturesReducer,
    notifications: notificationsReducer,
  },
  middleware: new MiddlewareArray().concat(thunk),
});

export type AppDispatch = typeof store.dispatch;

const persistor = persistStore(store);

export { store, persistor };
