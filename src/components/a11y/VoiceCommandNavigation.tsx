"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { useAccessibility } from "./AccessibilityContext";

// Type definition for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function VoiceCommandNavigation() {
    const { settings, updateSetting } = useAccessibility();
    const [mounted, setMounted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [lastCommand, setLastCommand] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);

        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = true;
                recognitionInstance.lang = "es-ES";
                recognitionInstance.interimResults = false;

                recognitionInstance.onstart = () => {
                    setIsListening(true);
                    setError(null);
                }
                recognitionInstance.onend = () => setIsListening(false);
                recognitionInstance.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setError("Error al escuchar");
                    setIsListening(false);
                };
                recognitionInstance.onresult = (event: any) => {
                    const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
                    setLastCommand(command);
                    handleCommand(command);
                };

                setRecognition(recognitionInstance);
            } else {
                // Check for insecure context (HTTP) which blocks the API
                if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                    setError("Requiere HTTPS para voz");
                } else {
                    setError("Navegador no soportado");
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!recognition) return;

        if (settings.voiceCommands && !isListening) {
            try {
                recognition.start();
            } catch (e) {
                // Already started or error
            }
        } else if (!settings.voiceCommands && isListening) {
            recognition.stop();
        }

        // Cleanup
        return () => {
            if (isListening && recognition) {
                try {
                    recognition.stop();
                } catch (e) { }
            }
        }

    }, [settings.voiceCommands, recognition, isListening]);

    const handleCommand = (cmd: string) => {
        console.log("Comando de voz:", cmd);

        if (cmd.includes("bajar") || cmd.includes("abajo")) {
            window.scrollBy({ top: 300, behavior: "smooth" });
        } else if (cmd.includes("subir") || cmd.includes("arriba")) {
            window.scrollBy({ top: -300, behavior: "smooth" });
        } else if (cmd.includes("inicio") || cmd.includes("principio")) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (cmd.includes("final") || cmd.includes("fondo")) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        } else if (cmd.includes("cerrar") || cmd.includes("salir")) {
            updateSetting("voiceCommands", false);
        }
    };

    if (!mounted || !settings.voiceCommands || typeof document === 'undefined') return null;

    if (error || !recognition) {
        return null;
    }

    return createPortal(
        <div className="fixed top-0 left-0 w-full bg-indigo-900 text-white p-2 z-[20002] shadow-xl flex items-center justify-between px-4 border-b-4 border-indigo-400">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${isListening ? "bg-red-500 animate-pulse" : "bg-gray-600"}`}>
                    <Mic size={24} />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">
                        {error ? <span className="text-red-300">{error}</span> : "Control por Voz Activo"}
                    </span>
                    <span className="text-xs text-indigo-200">Di "Bajar", "Subir", "Inicio", "Cerrar"</span>
                </div>
            </div>

            {lastCommand && (
                <div className="bg-black/30 px-3 py-1 rounded text-sm font-mono text-yellow-300">
                    "{lastCommand}"
                </div>
            )}

            <button
                onClick={() => updateSetting("voiceCommands", false)}
                className="p-2 hover:bg-indigo-800 rounded-full transition-colors"
            >
                <X size={28} />
            </button>
        </div>,
        document.body
    );
}
