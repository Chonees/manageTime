import React, { createContext, useContext, useState } from 'react';

// Define the light theme
const lightTheme = {
  colors: {
    background: '#f5f5f5',
    primary: '#4A90E2',
    text: '#333',
    card: '#fff',
    border: '#ddd',
    notification: '#e74c3c',
  },
};

// Define the dark theme
const darkTheme = {
  colors: {
    background: '#121212',
    primary: '#4A90E2',
    text: '#fff',
    card: '#1e1e1e',
    border: '#333',
    notification: '#e74c3c',
  },
};

// Create the context with default light theme
const ThemeContext = createContext({
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
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
export { lightTheme, darkTheme };

export default ThemeContext; 