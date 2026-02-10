"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowDown, CornerDownLeft, X } from "lucide-react";
import { useAccessibility } from "./AccessibilityContext";

export default function KeyboardNavigation() {
    const { settings, updateSetting } = useAccessibility();
    const [mounted, setMounted] = useState(false);
    const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Function to scan the DOM
    const scanElements = useCallback(() => {
        if (typeof document === 'undefined') return;

        // A broad list of focusable selectors
        const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const allElements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

        // Filter elements:
        // 1. Must be visible (offsetParent is a good check usually, or offsetWidth/Height)
        // 2. Must NOT be inside our accessibility tools (marked with data-a11y-ignore)
        const validElements = allElements.filter(el => {
            // Visibility check
            if (el.offsetWidth <= 0 && el.offsetHeight <= 0) return false;
            if (window.getComputedStyle(el).visibility === 'hidden') return false;
            if (el.closest('[data-a11y-ignore="true"]')) return false;
            if (el.closest('[aria-hidden="true"]')) return false;

            return true;
        });

        // Check if we need to update state to avoid loops? 
        // Actually we should just update.
        // We can try to preserve the current focused element index if possible, but simpler to just reset or keep current index number
        // if it's within bounds.

        setFocusableElements(val => {
            // Simple optimization: if length is same and first/last are same, maybe skip? 
            // No, let's just update. React handles array ref equality checks.
            if (val.length === validElements.length && val[0] === validElements[0]) return val;
            return validElements;
        });

    }, []);

    // Setup Observer and initial scan
    useEffect(() => {
        if (!settings.keyboardNav || !mounted) {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            return;
        }

        // Initial Scan
        scanElements();

        // Observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            // Debounce could be good here, but for now direct call
            scanElements();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden']
        });

        observerRef.current = observer;

        return () => {
            observer.disconnect();
        };
    }, [settings.keyboardNav, mounted, scanElements]);

    const handleMove = (direction: "next" | "prev") => {
        if (focusableElements.length === 0) {
            // Try scanning again just in case
            scanElements();
            return;
        }

        let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        // Wrap around
        if (nextIndex >= focusableElements.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = focusableElements.length - 1;

        setCurrentIndex(nextIndex);
        const el = focusableElements[nextIndex];
        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Visual indicator (backup for :focus-visible)
            el.style.outline = "4px solid #FACC15"; // Yellow
            el.style.outlineOffset = "2px";

            // Remove outline on blur
            el.addEventListener('blur', () => {
                el.style.outline = "";
                el.style.outlineOffset = "";
            }, { once: true });
        }
    };

    const clickCurrent = () => {
        if (currentIndex >= 0 && focusableElements[currentIndex]) {
            focusableElements[currentIndex].click();
            focusableElements[currentIndex].focus(); // Ensure focus stays
        }
    };

    if (!mounted || !settings.keyboardNav || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed bottom-0 left-0 w-full bg-red-600 p-2 sm:p-4 z-[10001] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t-4 border-white flex flex-wrap justify-center items-center gap-4"
            data-a11y-ignore="true"
        >
            <div className="absolute top-[-24px] left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-t-lg font-bold text-sm border-t border-x border-white whitespace-nowrap z-50">
                Navegación ({currentIndex + 1} / {focusableElements.length})
            </div>

            {/* Scroll Controls */}
            <div className="flex gap-2 mr-4 border-r-2 border-red-400 pr-4">
                <button
                    onClick={() => window.scrollBy({ top: -300, behavior: 'smooth' })}
                    className="flex flex-col items-center justify-center w-16 h-16 bg-white text-black rounded-lg border-2 border-black hover:bg-indigo-200 active:scale-95 transition-all shadow-md"
                    aria-label="Desplazar Arriba"
                >
                    <ArrowUp size={24} />
                    <span className="text-[10px] font-bold mt-1">Subir Pág</span>
                </button>
                <button
                    onClick={() => window.scrollBy({ top: 300, behavior: 'smooth' })}
                    className="flex flex-col items-center justify-center w-16 h-16 bg-white text-black rounded-lg border-2 border-black hover:bg-indigo-200 active:scale-95 transition-all shadow-md"
                    aria-label="Desplazar Abajo"
                >
                    <ArrowDown size={24} />
                    <span className="text-[10px] font-bold mt-1">Bajar Pág</span>
                </button>
            </div>

            {/* Focus Controls */}
            <div className="flex gap-4 items-center">
                <button
                    onClick={() => handleMove("prev")}
                    className="flex flex-col items-center justify-center w-20 h-20 bg-white text-black rounded-xl border-4 border-black hover:bg-yellow-300 active:scale-95 transition-all shadow-lg focus:ring-4 focus:ring-blue-500"
                    aria-label="Elemento Anterior"
                >
                    <ArrowUp size={32} strokeWidth={3} />
                    <span className="text-xs font-black uppercase mt-1">Anterior</span>
                </button>

                <button
                    onClick={clickCurrent}
                    className="flex flex-col items-center justify-center w-28 h-24 bg-yellow-400 text-black rounded-xl border-4 border-black hover:bg-yellow-300 active:scale-95 transition-all shadow-lg focus:ring-4 focus:ring-blue-500 relative -top-2"
                    aria-label="Seleccionar Elemento Actual"
                >
                    <CornerDownLeft size={32} strokeWidth={3} />
                    <span className="text-sm font-black uppercase mt-1">Entrar</span>
                </button>

                <button
                    onClick={() => handleMove("next")}
                    className="flex flex-col items-center justify-center w-20 h-20 bg-white text-black rounded-xl border-4 border-black hover:bg-yellow-300 active:scale-95 transition-all shadow-lg focus:ring-4 focus:ring-blue-500"
                    aria-label="Siguiente Elemento"
                >
                    <ArrowDown size={32} strokeWidth={3} />
                    <span className="text-xs font-black uppercase mt-1">Siguiente</span>
                </button>
            </div>

            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
                <button
                    onClick={() => updateSetting("keyboardNav", false)}
                    className="p-3 bg-black text-white rounded-full hover:bg-red-900 border-2 border-white focus:ring-4 focus:ring-white"
                    aria-label="Cerrar Navegación"
                >
                    <X size={20} />
                </button>
            </div>
        </div>,
        document.body
    );
}
