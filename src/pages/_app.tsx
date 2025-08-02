import "../styles/globals.css";
import React, { useEffect, useState } from "react";
import { ThemeProvider as MuiThemeProvider } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { createAppTheme } from "../theme";
import { AppProps } from "next/app";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../store/store";
import { Provider } from "react-redux";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { CircularProgress } from "@material-ui/core";
import ErrorBoundary from "../components/ErrorBoundary";

// Component that provides dynamic theme based on context
const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const muiTheme = createAppTheme();

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  const [isSSR, setIsSSR] = useState(true);

  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement!.removeChild(jssStyles);
    }
    
    // Mark as client-side rendered to prevent hydration mismatches
    setIsSSR(false);
  }, []);

  // Show loading during SSR hydration to prevent mismatches
  if (isSSR) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#1a1a1a'
      }}>
        <CircularProgress style={{ color: 'white' }} />
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate 
            loading={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                backgroundColor: '#1a1a1a'
              }}>
                <CircularProgress style={{ color: 'white' }} />
              </div>
            } 
            persistor={persistor}
          >
            <ThemeProvider>
              <DynamicThemeProvider>
                <ErrorBoundary>
                  <Component {...pageProps} />
                </ErrorBoundary>
              </DynamicThemeProvider>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;
