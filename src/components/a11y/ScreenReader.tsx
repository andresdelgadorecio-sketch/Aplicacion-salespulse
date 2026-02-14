"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Volume2, StopCircle, X } from "lucide-react";
import { useAccessibility } from "./AccessibilityContext";

export default function ScreenReader() {
    const { settings, updateSetting } = useAccessibility();
    const [mounted, setMounted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentText, setCurrentText] = useState("");

    useEffect(() => {
        setMounted(true);

        // Cleanup on unmount
        return () => {
            cancelSpeech();
        };
    }, []);

    const cancelSpeech = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            removeHighlight();
        }
    };

    const removeHighlight = () => {
        document.querySelectorAll('.a11y-reading').forEach(el => {
            el.classList.remove('a11y-reading');
            (el as HTMLElement).style.backgroundColor = '';
            (el as HTMLElement).style.color = '';
        });
    }

    const speak = (text: string, element?: HTMLElement) => {
        cancelSpeech();

        if (!text.trim()) return;

        if (element) {
            removeHighlight();
            element.classList.add('a11y-reading');
            // We use inline styles to override specificity, but ideally a class with !important in CSS would be cleaner.
            // But for this dynamic highlight, this is effective.
            element.style.backgroundColor = '#FFFF00';
            element.style.color = '#000000';
            element.style.outline = '3px solid #000';
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.rate = 1;

        utterance.onend = () => {
            setIsPlaying(false);
            if (element) {
                element.classList.remove('a11y-reading');
                element.style.backgroundColor = '';
                element.style.color = '';
                element.style.outline = '';
            }
        };

        utterance.onerror = () => {
            setIsPlaying(false);
            removeHighlight();
        };

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setCurrentText(text.substring(0, 30) + "...");
    };

    useEffect(() => {
        if (!mounted) return;

        const clickHandler = (e: MouseEvent) => {
            if (!settings.screenReader) return;

            // Don't read if clicking inside the widget itself
            if ((e.target as HTMLElement).closest('.a11y-ignore')) return;

            const target = e.target as HTMLElement;

            // Find closest text block
            const textBlock = target.closest('p, h1, h2, h3, h4, h5, h6, li, span, a, button, td, th');

            if (textBlock && textBlock.textContent) {
                e.preventDefault();
                e.stopPropagation();
                speak(textBlock.textContent, textBlock as HTMLElement);
            }
        };

        if (settings.screenReader) {
            document.addEventListener('click', clickHandler, true); // Capture phase to prevent other clicks if needed, or bubble? 
            // Capture is better to intercept before other handlers if we want to consume the click.
        } else {
            cancelSpeech();
        }

        return () => {
            document.removeEventListener('click', clickHandler, true);
        }
    }, [settings.screenReader, mounted]);

    if (!mounted || !settings.screenReader || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed bottom-24 right-6 bg-black text-white p-4 rounded-xl shadow-2xl z-[20003] w-64 border-2 border-white a11y-ignore"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold flex items-center gap-2">
                    <Volume2 className="text-yellow-400" />
                    Lector Web
                </h3>
                <button
                    onClick={() => updateSetting("screenReader", false)}
                    className="text-gray-400 hover:text-white"
                    aria-label="Cerrar Lector"
                >
                    <X size={20} />
                </button>
            </div>

            <p className="text-xs text-gray-300 mb-3 bg-gray-900 p-2 rounded max-h-16 overflow-hidden">
                {isPlaying ? `Leyendo: "${currentText}"` : "Haz clic en un texto para leerlo"}
            </p>

            <div className="flex gap-2">
                {isPlaying ? (
                    <button
                        onClick={cancelSpeech}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
                    >
                        <StopCircle size={16} /> Detener
                    </button>
                ) : (
                    <div className="w-full text-center text-xs text-gray-500 italic py-2">
                        Esperando selección...
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
