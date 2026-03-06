import { createTheme } from '@mui/material/styles'

// Code couleur strict logo Ahibahil Khadim : bleu cercle #2DA9E1, blanc #FFFFFF, noir texte #1A1A1A
const colors = {
  vert: '#2DA9E1',
  vertClair: '#66CCFF',
  vertFonce: '#0F4D71',
  or: '#2DA9E1',
  orClair: '#66CCFF',
  orFonce: '#0F4D71',
  beige: '#F4FAFF',
  beigeClair: '#F9FCFF',
  noir: '#1A1A1A',
  blanc: '#FFFFFF',
}

const theme = createTheme({
  palette: {
    primary: {
      main: colors.vert,
      light: colors.vertClair,
      dark: colors.vertFonce,
      contrastText: colors.blanc,
    },
    secondary: {
      main: colors.or,
      light: colors.orClair,
      dark: colors.orFonce,
      contrastText: colors.noir,
    },
    background: {
      default: colors.beige,
      paper: colors.blanc,
    },
    text: {
      primary: colors.noir,
      secondary: colors.vertFonce,
    },
    success: { main: colors.vert },
    warning: { main: colors.or },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Arial", sans-serif',
    h1: { fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700 },
    h2: { fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 600 },
    h3: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 },
    h4: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: colors.vert,
          color: colors.blanc,
          '&:hover': { background: colors.vertFonce, transform: 'translateY(-1px)' },
        },
        outlined: {
          borderColor: colors.vert,
          color: colors.vertFonce,
          '&:hover': { borderColor: colors.vertFonce, backgroundColor: `${colors.vert}18` },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          borderLeft: `3px solid ${colors.vert}`,
          background: colors.blanc,
          boxShadow: `0 2px 12px ${colors.vert}12`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: `0 8px 24px ${colors.vert}20`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: colors.beige,
          borderBottom: `2px solid ${colors.vert}`,
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.vert },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.vert, borderWidth: 2 },
          },
        },
      },
    },
  },
})

export default theme
export { colors }
