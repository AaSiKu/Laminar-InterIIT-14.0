import { createTheme } from '@mui/material/styles';
import { blue, grey, red } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: blue[700], // #1976d2
    },
    secondary: {
      main: grey[500], // #9e9e9e
    },
    background: {
      default: grey[100], // #F5F5F5
      paper: '#FFFFFF',
    },
    text: {
      primary: grey[900], // #212121
      secondary: grey[700], // #616161
    },
    error: {
      main: red[500], // #f44336
    },
    divider: grey[300], // #E0E0E0
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          borderBottom: `1px solid ${grey[300]}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        outlined: {
          borderColor: blue[700],
          color: blue[700],
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderColor: grey[300],
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderColor: grey[300],
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        textColor: 'primary',
        indicatorColor: 'primary',
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: grey[700], // text.secondary
          '&.Mui-selected': {
            color: blue[700], // primary.main
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 'bold',
            color: grey[700], // text.secondary
          },
        },
      },
    },
  },
});

export default theme;
