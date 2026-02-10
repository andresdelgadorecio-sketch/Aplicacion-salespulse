"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the available settings
export interface AccessibilitySettings {
    contrast: boolean; // High Contrast
    textScale: 1 | 1.1 | 1.25 | 1.5; // Font size multiplier
    animations: boolean; // True = on (default), False = paused
    highlightLinks: boolean; // Highlight all links
    dyslexiaFont: boolean; // Use dyslexia-friendly font
    cursor: 'default' | 'big'; // Cursor size
    voiceCommands: boolean; // Enable voice control navigation
    screenReader: boolean; // Enable click-to-read
    keyboardNav: boolean; // Enable on-screen keyboard nav widget
    readingGuide: boolean; // Show reading guide line (horizonal bar)
}

const defaultSettings: AccessibilitySettings = {
    contrast: false,
    textScale: 1,
    animations: true,
    highlightLinks: false,
    dyslexiaFont: false,
    cursor: 'default',
    voiceCommands: false,
    screenReader: false,
    keyboardNav: false,
    readingGuide: false,
};

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
    resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('a11y-settings');
        if (saved) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to parse accessibility settings", e);
            }
        }
        setMounted(true);
    }, []);

    // Save to localStorage whenever settings change
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('a11y-settings', JSON.stringify(settings));
        }
    }, [settings, mounted]);

    // Apply changes to DOM
    useEffect(() => {
        if (!mounted) return;

        const body = document.body;
        const html = document.documentElement;

        // 1. Contrast
        body.classList.toggle('a11y-contrast', settings.contrast);

        // 2. Text Scale - Applying to root html font-size is usually best for rem-based layouts
        // Default Tailwind Inter is usually 16px. 
        // We can set a percentage on html. 100% = 16px.
        html.style.fontSize = `${settings.textScale * 100}%`;

        // 3. Animations
        body.classList.toggle('a11y-paused', !settings.animations);

        // 4. Highlight Links
        body.classList.toggle('a11y-highlight-links', settings.highlightLinks);

        // 5. Dyslexia Font
        body.classList.toggle('a11y-font-dyslexia', settings.dyslexiaFont);

        // 6. Cursor
        body.classList.toggle('a11y-cursor-big', settings.cursor === 'big');

        // 7. Voice, ScreenReader, KeyboardNav are handled by their mounting components

        // 8. Reading Guide styling if needed, or component renders

    }, [settings, mounted]);

    const updateSetting = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    // Avoid hydration mismatch for persistent styles if possible, or accept initial flash
    // Since we rely on useEffect for body class manipulation, there will be no hydration error,
    // but potentially a flash of unstyled content (FOUC) regarding a11y features.
    // This is acceptable for a widget-based approach.

    return (
        <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}
