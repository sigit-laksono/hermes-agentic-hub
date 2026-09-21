import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved
      }
    } catch {}
    return 'dark'
  })

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme
      if (saved === 'light') return false
      if (saved === 'system') {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    } catch {}
    return true
  })

  useEffect(() => {
    const root = document.documentElement

    const apply = () => {
      let activeDark = false
      if (theme === 'system') {
        activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        activeDark = theme === 'dark'
      }

      setIsDark(activeDark)
      if (activeDark) {
        root.classList.add('dark')
        root.style.colorScheme = 'dark'
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.style.colorScheme = 'light'
        root.setAttribute('data-theme', 'light')
      }
    }

    apply()

    try {
      localStorage.setItem('theme', theme)
    } catch {}

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => apply()
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
