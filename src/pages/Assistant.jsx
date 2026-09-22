import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Bot, User, ShieldAlert } from "lucide-react";
import api from "../api/axios.js";
import Markdown from "../components/Markdown.jsx";

export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/ai/history");
      if (res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    // Optimistic user message addition
    const tempUserMsg = { role: "user", content: userText, _id: Date.now() };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { question: userText });
      const assistantMsg = {
        role: "assistant",
        content:
          typeof res.data?.content === "string" && res.data.content.trim()
            ? res.data.content
            : "FitMind AI returned an empty response. Please try again.",
        _id: res.data.messageId,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.response?.data?.message || "Sorry, FitMind AI is temporarily unavailable. Please verify your connection or AI key.",
          _id: Date.now() + 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="font-bold text-base flex items-center gap-2">
              FitMind AI Fitness Assistant
              <span className="chip bg-brand-500/20 text-brand-600 dark:text-brand-300 text-[10px] uppercase font-bold">
                Online
              </span>
            </h1>
            <p className="text-xs text-muted">Context-aware fitness, form & nutrition coaching</p>
          </div>
        </div>
      </div>

      {/* Non-medical Disclaimer Alert */}
      <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
        <ShieldAlert size={16} className="shrink-0" />
        <span>FitMind AI provides general fitness & performance advice and is not a licensed medical professional.</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 card p-4 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.length === 0 && !loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center mx-auto text-xl">
              💡
            </div>
            <h3 className="font-bold text-lg">Ask FitMind AI Anything</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Ask about exercise form, post-workout nutrition, recovery strategies, or how to progressive overload safely.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                "What should I eat post-workout?",
                "How do I improve my bench press form?",
                "What is progressive overload?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-full"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={msg._id || index}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-500 text-white rounded-br-none"
                  : "glass border border-[var(--surface-border)] rounded-bl-none"
              }`}
            >
              {msg.role === "assistant" ? <Markdown text={msg.content} /> : msg.content}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 mt-1">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="glass p-3 rounded-2xl text-xs text-muted flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
              FitMind AI is generating your response...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="card p-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a fitness or diet question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input flex-1 border-none focus:ring-0 bg-transparent text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-1 rounded-xl"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
