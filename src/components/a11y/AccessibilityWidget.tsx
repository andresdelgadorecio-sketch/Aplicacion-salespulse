"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Accessibility,
    X,
    Eye,
    Type,
    MousePointer2,
    Zap,
    Volume2,
    Mic,
    Keyboard,
    Contrast,
    Undo
} from "lucide-react";
import { useAccessibility } from "./AccessibilityContext";

export default function AccessibilityWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { settings, updateSetting, resetSettings } = useAccessibility();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const toggleWidget = () => setIsOpen(!isOpen);

    // Portal target
    const portalRoot = document.body;

    const options = [
        {
            id: "contrast",
            label: "Alto Contraste",
            icon: Contrast,
            value: settings.contrast,
            onClick: () => updateSetting("contrast", !settings.contrast),
        },
        {
            id: "textScale",
            label: "Tamaño Texto",
            icon: Type,
            // Cycle through sizes
            value: settings.textScale > 1,
            displayValue: `${Math.round(settings.textScale * 100)}%`,
            onClick: () => {
                const sizes = [1, 1.1, 1.25, 1.5];
                const nextIndex = (sizes.indexOf(settings.textScale) + 1) % sizes.length;
                updateSetting("textScale", sizes[nextIndex] as any);
            },
        },
        {
            id: "dyslexiaFont",
            label: "Fuente Dislexia",
            icon: Type,
            value: settings.dyslexiaFont,
            onClick: () => updateSetting("dyslexiaFont", !settings.dyslexiaFont),
        },
        {
            id: "cursor",
            label: "Cursor Grande",
            icon: MousePointer2,
            value: settings.cursor === "big",
            onClick: () => updateSetting("cursor", settings.cursor === "big" ? "default" : "big"),
        },
        {
            id: "highlightLinks",
            label: "Resaltar Enlaces",
            icon: Zap,
            value: settings.highlightLinks,
            onClick: () => updateSetting("highlightLinks", !settings.highlightLinks),
        },
        {
            id: "animations",
            label: "Pausar Animación",
            icon: Eye, // "Pause" icon logic inverted: if animations=true, it's play; we want "Pause" button active when paused?
            // Let's make the button "Pause Animations". So if settings.animations is true (default), button is off.
            // If settings.animations is false (paused), button is on.
            value: !settings.animations,
            onClick: () => updateSetting("animations", !settings.animations),
        },
        {
            id: "screenReader",
            label: "Lector de Voz",
            icon: Volume2,
            value: settings.screenReader,
            onClick: () => updateSetting("screenReader", !settings.screenReader),
        },
        {
            id: "voiceCommands",
            label: "Comandos Voz",
            icon: Mic,
            value: settings.voiceCommands,
            onClick: () => updateSetting("voiceCommands", !settings.voiceCommands),
        },
        {
            id: "keyboardNav",
            label: "Teclado Virtual",
            icon: Keyboard,
            value: settings.keyboardNav,
            onClick: () => updateSetting("keyboardNav", !settings.keyboardNav),
        },
    ];

    return createPortal(
        <div className="font-sans text-base antialiased" style={{ zIndex: 20000 }}>
            {/* Floating Trigger Button */}
            <motion.button
                className="fixed top-1/2 right-0 transform -translate-y-1/2 z-[20000] p-3 bg-indigo-600 text-white rounded-l-2xl rounded-r-none shadow-[-4px_0_10px_rgba(0,0,0,0.2)] hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-400"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleWidget}
                aria-label="Abrir menú de accesibilidad"
                aria-expanded={isOpen}
                data-a11y-ignore="true"
            >
                {isOpen ? <X size={28} /> : <Accessibility size={28} />}
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleWidget}
                            className="fixed inset-0 bg-black/40 z-[19999] backdrop-blur-sm"
                            aria-hidden="true"
                        />

                        {/* Sidebar Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700 shadow-2xl z-[20000] overflow-y-auto"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Herramientas de Accesibilidad"
                            data-a11y-ignore="true"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                        <Accessibility className="text-indigo-400" />
                                        Accesibilidad
                                    </h2>
                                    <button
                                        onClick={toggleWidget}
                                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                        aria-label="Cerrar menú"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {options.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={opt.onClick}
                                            className={`
                        relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                        ${opt.value
                                                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                                                }
                      `}
                                            aria-pressed={opt.value}
                                        >
                                            <opt.icon size={32} className={`mb-3 ${opt.value ? "text-indigo-400" : "text-slate-500"}`} />
                                            <span className="text-sm font-medium text-center">{opt.label}</span>
                                            {opt.displayValue && (
                                                <span className="absolute top-2 right-2 text-xs font-bold bg-slate-900/50 px-1.5 py-0.5 rounded text-indigo-300">
                                                    {opt.displayValue}
                                                </span>
                                            )}

                                            {/* Active Indicator */}
                                            {opt.value && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-slate-700">
                                    <button
                                        onClick={resetSettings}
                                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/50 border border-transparent transition-all font-medium"
                                    >
                                        <Undo size={18} />
                                        Restablecer Todo
                                    </button>
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-slate-600">Sistema Avanzado de Accesibilidad</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>,
        portalRoot
    );
}
