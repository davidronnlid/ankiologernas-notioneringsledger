import { createMuiTheme, Theme } from '@material-ui/core';
import { CommonColors } from '@material-ui/core/styles/createPalette';

// APP COLOR THEME
interface CustomColors extends CommonColors {
  blue: string;
  orange: string;
}

const appBlue = '#0B72B9';
const appOrange = '#FFBA60';

// CREATE DARK THEME
export const createAppTheme = (): Theme => {
  return createMuiTheme({
    palette: {
      type: 'dark', // Dark mode only
      common: {
        blue: appBlue,
        orange: appOrange,
      } as CustomColors,
      primary: {
        main: appBlue,
      },
      secondary: {
        main: appOrange,
      },
      background: {
        default: '#302e32',
        paper: '#2c2c2c',
      },
      text: {
        primary: '#ffffff',
        secondary: '#cccccc',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        color: '#ffffff',
      },
      h2: {
        color: '#ffffff',
      },
      h3: {
        color: '#ffffff',
      },
      h4: {
        color: '#ffffff',
      },
      h5: {
        color: '#ffffff',
      },
      h6: {
        color: '#ffffff',
      },
      body1: {
        color: '#ffffff',
      },
      body2: {
        color: '#cccccc',
      },
    },
    overrides: {
      MuiCssBaseline: {
        '@global': {
          body: {
            backgroundColor: '#302e32',
            color: '#ffffff',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiPaper: {
        root: {
          backgroundColor: '#2c2c2c',
          color: '#ffffff',
        },
      },
      MuiCard: {
        root: {
          backgroundColor: '#2c2c2c',
          color: '#ffffff',
        },
      },
    },
  });
};

// Default dark theme
const theme = createAppTheme();

export default theme;
