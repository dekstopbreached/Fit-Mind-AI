import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    // Apply theme to document
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
    }
    // Persist theme preference
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
