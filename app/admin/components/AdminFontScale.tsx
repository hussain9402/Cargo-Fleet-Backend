"use client";

import { useEffect } from 'react';

/** Slightly larger type across the admin console (Tailwind rem scale). */
export function AdminFontScale() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = '17px';
    return () => {
      root.style.fontSize = previous;
    };
  }, []);

  return null;
}
