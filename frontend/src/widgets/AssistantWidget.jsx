import { Bot, Send, X } from 'lucide-react';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useLocalStorage('life:assistant-chat', [
    { role: 'assistant', content: 'Hallo Philipp. Wobei soll ich dir helfen?' }
  ]);
  const [loading, setLoading] = useState(false);

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const result = await api.assistant(next);
      setMessages([...next, { role: 'assistant', content: result.message }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `Fehler: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex h-[520px] w-[min(92vw,380px)] flex-col rounded-lg border border-cyan-300/20 bg-slate-950/95 shadow-2xl shadow-cyan-950/40">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2 text-white"><Bot className="h-5 w-5 text-cyan-300" /> Assistent</div>
            <button className="icon-soft" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`rounded-md p-3 text-sm ${message.role === 'user' ? 'ml-8 bg-cyan-300 text-slate-950' : 'mr-8 bg-white/10 text-slate-100'}`}>{message.content}</div>
            ))}
            {loading && <p className="text-sm text-slate-400">Denke nach...</p>}
          </div>
          <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={send}>
            <input className="life-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nachricht..." />
            <button className="icon-soft"><Send className="h-4 w-4" /></button>
          </form>
        </motion.div>
      )}
      <button onClick={() => setOpen(!open)} className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/30">
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}
