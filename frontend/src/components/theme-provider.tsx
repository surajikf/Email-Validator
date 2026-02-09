"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Extracts the props type from the NextThemesProvider component
// This is a common pattern to avoid importing 'ThemeProviderProps' which might not be exported directly
// or to be resilient to type definition changes. 
// However, typically `ComponentProps<typeof NextThemesProvider>` is cleaner.
// For simplicity and robustness with standard types:

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
