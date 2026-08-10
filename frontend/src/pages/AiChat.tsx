import { useState, useRef, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../api/api";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  reasoning?: string;
  timestamp: Date;
  showReasoning?: boolean;
  streaming?: boolean;
  rejected?: boolean;
  privacyBlocked?: boolean;
}

const SUGGESTED_QUERIES = [
  "Which companies should I focus on?",
  "How do I prepare for my shortlisted interviews?",
  "What is my current placement status?",
  "Tips to improve my profile for product companies",
];

const SESSION_KEY = "nextgen_ai_chat_history";
const AI_ENDPOINT = import.meta.env.VITE_AI_API_BASE_URL ? (import.meta.env.VITE_AI_API_BASE_URL + "/chat/stream") : "/ai/chat/stream";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function serializeMessages(msgs: Message[]): string {
  return JSON.stringify(msgs.map(m => ({ ...m, timestamp: m.timestamp.toISOString(), streaming: false })));
}

function deserializeMessages(raw: string): Message[] {
  try { return JSON.parse(raw).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })); }
  catch { return []; }
}

/* Main AI Chat Page */
export default function AiChat() {
  const navigate = useNavigate();
  const username = auth.getUsername() || "student";
  const token = localStorage.getItem("token") || "";

  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? deserializeMessages(stored) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState<string>(
    () => sessionStorage.getItem("nextgen_ai_student_name") || ""
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) sessionStorage.setItem(SESSION_KEY, serializeMessages(messages));
  }, [messages]);

  useEffect(() => {
    if (studentName) sessionStorage.setItem("nextgen_ai_student_name", studentName);
  }, [studentName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    sessionStorage.removeItem(SESSION_KEY);
  };

  const sendMessage = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setError("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: "user-" + Date.now(), role: "user", text: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const aiMsgId = "ai-" + Date.now();
    setMessages(prev => [...prev, {
      id: aiMsgId, role: "ai", text: "", reasoning: "",
      timestamp: new Date(), showReasoning: false, streaming: true,
    }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, query: trimmed, token }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const t = await response.text();
        throw new Error(t || "Error " + response.status);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let finalReasoning = "";
      let isRejected = false;
      let isPrivacyBlocked = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const sseLines = buffer.split(/\r?\n\r?\n/);
        buffer = sseLines.pop() ?? "";
        for (const line of sseLines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === "meta") {
              if (evt.student_name && !studentName) setStudentName(evt.student_name);
            } else if (evt.type === "token") {
              accumulatedText += evt.content;
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: accumulatedText } : m));
            } else if (evt.type === "done") {
              finalReasoning = evt.reasoning || "";
            } else if (evt.type === "rejected") {
              accumulatedText = evt.content;
              isRejected = true;
              isPrivacyBlocked = evt.privacy_blocked || false;
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, text: accumulatedText, rejected: true, privacyBlocked: isPrivacyBlocked } : m
              ));
            } else if (evt.type === "error") {
              throw new Error(evt.content);
            }
          } catch (_) { /* skip malformed lines */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? {
          ...m,
          text: accumulatedText || "No response generated.",
          reasoning: finalReasoning,
          streaming: false,
          rejected: isRejected,
          privacyBlocked: isPrivacyBlocked,
        } : m
      ));

    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
      } else {
        setError(
          err.message?.includes("fetch")
            ? "Cannot connect to AI service. Ensure Ollama is running and the AI service is on port 8000."
            : err.message || "Something went wrong."
        );
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, username, token, studentName]);

  const toggleReasoning = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, showReasoning: !m.showReasoning } : m));
  };

  const displayName = studentName || username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="ai-chat-layout">
      <header className="ai-chat-header">
        <button className="ai-chat-back-btn" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
        <div className="ai-chat-header-info">
          <div className="ai-chat-avatar">🤖</div>
          <div>
            <div className="ai-chat-title">NextGen AI Advisor</div>
            <div className="ai-chat-subtitle">Personalized for {displayName} · Your data only</div>
          </div>
        </div>
        <div className="ai-chat-header-right">
          {messages.length > 0 && (
            <button className="ai-chat-clear-btn" onClick={clearChat} title="Clear chat history">
              🗑 Clear
            </button>
          )}
          <div className="ai-chat-status">
            <span className="ai-chat-status-dot" />
            Ollama · llama3.1:8b
          </div>
        </div>
      </header>

      <div className="ai-privacy-banner">
        🔒 This AI only has access to <strong>{displayName}&apos;s</strong> data. Queries about other students are blocked.
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && !loading ? (
          <div className="ai-chat-welcome">
            <div className="ai-chat-welcome-icon">🎓</div>
            <h2>Hi {displayName.split(" ")[0]}! I&apos;m your AI Placement Advisor.</h2>
            <p>
              I know <strong>your</strong> profile, applications, and placement journey.
              Ask me anything about <em>your</em> placement!
            </p>
            <div className="ai-chat-welcome-chips">
              {SUGGESTED_QUERIES.map(q => (
                <button key={q} className="ai-chat-chip" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={"ai-msg-row " + msg.role}>
                {msg.role === "ai" ? (
                  <div className={"ai-msg-icon" + (msg.privacyBlocked ? " ai-msg-icon--privacy" : msg.rejected ? " ai-msg-icon--rejected" : "")}>
                    {msg.privacyBlocked ? "🔒" : msg.rejected ? "⚠️" : "🤖"}
                  </div>
                ) : (
                  <div className="ai-msg-user-icon">{initials}</div>
                )}
                <div className="ai-msg-content">
                  <div className={"ai-msg-bubble" + (msg.rejected ? " ai-msg-bubble--rejected" : "") + (msg.privacyBlocked ? " ai-msg-bubble--privacy" : "")}>
                    {msg.role === "ai" ? (
                      <AiMarkdown text={msg.text} streaming={msg.streaming} />
                    ) : msg.text}
                  </div>
                  {msg.role === "ai" && !msg.streaming && !msg.rejected && msg.reasoning && (
                    <>
                      <button className="ai-reasoning-toggle" onClick={() => toggleReasoning(msg.id)}>
                        🧠 {msg.showReasoning ? "Hide" : "Show"} reasoning
                      </button>
                      {msg.showReasoning && (
                        <div className="ai-reasoning-panel">
                          <div className="ai-reasoning-label">Step-by-step reasoning</div>
                          <AiMarkdown text={msg.reasoning} />
                        </div>
                      )}
                    </>
                  )}
                  <span className="ai-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            {loading && !messages.some(m => m.streaming) && (
              <div className="ai-typing-row">
                <div className="ai-msg-icon">🤖</div>
                <div className="ai-typing-bubble">
                  <span className="ai-typing-dot" /><span className="ai-typing-dot" /><span className="ai-typing-dot" />
                </div>
              </div>
            )}
          </>
        )}
        {error && <div className="ai-chat-error">⚠️ {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        <div className="ai-chat-input-row">
          <div className="ai-chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="ai-chat-textarea"
              rows={1}
              placeholder="Ask me anything about your placement journey..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <button
            className="ai-chat-send-btn"
            onClick={() => loading ? abortRef.current?.abort() : sendMessage(input)}
            disabled={!loading && !input.trim()}
            title={loading ? "Stop generating" : "Send (Enter)"}
          >
            {loading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="ai-chat-footer-hint">
          Powered by Ollama llama3.1:8b + ChromaDB RAG · Enter to send · Shift+Enter for newline · Only YOUR data is used
        </p>
      </div>
    </div>
  );
}

/* Markdown renderer component */
function AiMarkdown({ text, streaming }: { text: string; streaming?: boolean }) {
  if (!text && !streaming) return null;
  return (
    <div className="ai-md-root">
      {renderMdNodes(text)}
      {streaming && <span className="ai-cursor-blink">&#x2588;</span>}
    </div>
  );
}

function renderMdNodes(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(<pre key={"cb" + i} className="ai-md-code-block"><code>{codeLines.join("\n")}</code></pre>);
      i++;
      continue;
    }
    // Bullet list
    if (/^[\s]*[-*\u2022]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*\u2022]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*\u2022]\s/, ""));
        i++;
      }
      nodes.push(<ul key={"ul" + i} className="ai-md-ul">{items.map((it, idx) => <li key={idx}>{inlineMd(it)}</li>)}</ul>);
      continue;
    }
    // Numbered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      nodes.push(<ol key={"ol" + i} className="ai-md-ol">{items.map((it, idx) => <li key={idx}>{inlineMd(it)}</li>)}</ol>);
      continue;
    }
    // Headings
    const hm = line.match(/^(#{1,3})\s+(.*)/);
    if (hm) {
      const lvl = Math.min(hm[1].length + 2, 6);
      const Tag = ("h" + lvl) as keyof JSX.IntrinsicElements;
      nodes.push(<Tag key={"h" + i} className="ai-md-heading">{inlineMd(hm[2])}</Tag>);
      i++;
      continue;
    }
    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={"hr" + i} className="ai-md-hr" />);
      i++;
      continue;
    }
    // Empty line
    if (line.trim() === "") {
      nodes.push(<div key={"sp" + i} className="ai-md-spacer" />);
      i++;
      continue;
    }
    // Paragraph
    nodes.push(<p key={"p" + i} className="ai-md-p">{inlineMd(line)}</p>);
    i++;
  }
  return nodes;
}

function inlineMd(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const raw = match[0];
    if (raw.startsWith("**")) parts.push(<strong key={match.index}>{raw.slice(2, -2)}</strong>);
    else if (raw.startsWith("*")) parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
    else if (raw.startsWith("`")) parts.push(<code key={match.index} className="ai-md-inline-code">{raw.slice(1, -1)}</code>);
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 0 ? text : parts.length === 1 ? parts[0] : <>{parts}</>;
}
