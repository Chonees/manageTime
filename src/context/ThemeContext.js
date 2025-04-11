import React, { createContext, useContext, useState } from 'react';

// Define the app theme colors
const appTheme = {
  colors: {
    darkGrey: '#2e2e2e',    // Color de fondo principal oscuro
    lightCream: '#fff3e5',  // Color crema claro
    white: '#ffffff',       // Blanco
    black: '#000000',       // Negro
    background: '#2e2e2e',  // Fondo de la aplicación (gris oscuro)
    primary: '#fff3e5',     // Color primario (crema claro)
    secondary: '#ffffff',   // Color secundario (blanco)
    text: {
      primary: '#ffffff',   // Texto principal (blanco)
      secondary: '#fff3e5', // Texto secundario (crema claro)
      dark: '#2e2e2e',      // Texto oscuro (gris oscuro)
    },
    input: {
      background: '#ffffff20', // Fondo semi-transparente para inputs
      border: '#ffffff40',    // Borde de inputs
      text: '#ffffff',        // Texto de inputs
    },
    button: {
      primary: '#fff3e5',     // Botón primario (crema claro)
      secondary: '#2e2e2e',   // Botón secundario (gris oscuro)
      text: '#2e2e2e',        // Texto del botón (gris oscuro)
    },
    error: '#ff5252',        // Color para errores
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    round: 999,
  },
};

// Create the context with default theme
const ThemeContext = createContext({
  theme: appTheme,
  toggleTheme: () => {},
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
  const theme = appTheme;

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook to use the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

// Export the theme constants for direct use if needed
export { appTheme };

export default ThemeContext;