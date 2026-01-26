'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy tu asistente de Sales Pulse. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date()
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        try {
            const response = await fetch('https://n8n.testn8n.online/webhook/cf01485a-07b5-4aed-af36-80e39e753ee7', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage.content }),
            })

            let data
            const contentType = response.headers.get("content-type")
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json()
            } else {
                // If response is text (often webhooks return simple text/object)
                const text = await response.text()
                try {
                    data = JSON.parse(text)
                } catch {
                    data = { output: text }
                }
            }

            // Adaptar según la respuesta real de tu n8n
            // Asumiendo que devuelve { "output": "respuesta..." } o similar
            // O si devuelve un array de objetos, ajusta aquí.
            const botResponseContent = data.output || data.message || data.text || JSON.stringify(data)

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: botResponseContent,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, botMessage])
        } catch (error) {
            console.error('Error calling n8n:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un error al conectar con el agente. Intenta de nuevo.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50 group border border-indigo-400/50"
                >
                    <Sparkles className="h-6 w-6 animate-pulse absolute opacity-50" />
                    <MessageSquare className="h-6 w-6 relative z-10" />
                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">

                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-indigo-900/50 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                                <Bot className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Sales Pulse AI</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-slate-400">En línea</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'assistant'
                                        ? 'bg-indigo-600/20 border border-indigo-500/30'
                                        : 'bg-slate-700/50 border border-slate-600/30'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <Bot className="h-4 w-4 text-indigo-400" />
                                    ) : (
                                        <User className="h-4 w-4 text-slate-300" />
                                    )}
                                </div>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                    <span className="block text-[10px] opacity-50 mt-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-500 mt-2">
                            Powered by n8n Agents
                        </p>
                    </form>
                </div>
            )}
        </>
    )
}
