import { useState, useEffect, useRef } from "react";
import { api } from "../api/api";

function FormattedText({ content, onCopyCode }) {
  // Simple, robust custom Markdown parser for headings, code blocks, bold, lists, and tables
  const safeContent = typeof content === "string" ? content : String(content || "");
  const lines = safeContent.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = "";

  lines.forEach((line, idx) => {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.replace("```", "").trim() || "code";
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const fullCode = codeBuffer.join("\n");
        elements.push(
          <div className="code-block-wrapper" key={`code-${idx}`}>
            <div className="code-block-header">
              <span className="code-lang-tag">{codeLang}</span>
              <button
                type="button"
                className="copy-code-btn"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(fullCode).catch(() => {});
                  }
                  if (onCopyCode) {
                    onCopyCode(fullCode);
                  } else {
                    alert("Code copied to clipboard! 📋");
                  }
                }}
              >
                📋 Copy Code
              </button>
            </div>
            <pre className="code-pre">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={idx} className="md-h3">{renderInline(line.replace("### ", ""))}</h3>);
      return;
    }
    if (line.startsWith("#### ")) {
      elements.push(<h4 key={idx} className="md-h4">{renderInline(line.replace("#### ", ""))}</h4>);
      return;
    }

    // Bullet points
    if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) {
      elements.push(
        <li key={idx} className="md-li">
          {renderInline(line.replace(/^[-•*]\s+/, ""))}
        </li>
      );
      return;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      elements.push(
        <div key={idx} className="md-numbered">
          {renderInline(line)}
        </div>
      );
      return;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<div key={idx} className="md-spacer" />);
      return;
    }

    // Normal paragraph
    elements.push(<p key={idx} className="md-p">{renderInline(line)}</p>);
  });

  return <div className="formatted-message">{elements}</div>;
}

// Inline parser for **bold**, *italics*, and `code`
function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function AIAssistant({ addToast }) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "👋 **Hello! I am your Universal Student Life AI Tutor & Study Assistant.**\n\nI can help you with:\n- 💻 **Coding & Debugging** (Python, C++, Java, JS, SQL, Algorithms)\n- 📚 **Engineering & CS Concepts** (DBMS, OS, Networks, OOPs, Web Dev)\n- 📅 **Custom Study Timetables** based on your real deadlines\n- 📊 **Attendance & Bunk Calculations** against the 75% rule\n- 💼 **Placement & Interview Preparation**\n\nAsk me anything or pick a quick prompt below!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMessage = { sender: "user", text: query.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.sendAIChat(query.trim(), apiKey);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: data.reply, source: data.source }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **Connection Error**: ${err.message || "Failed to reach AI service."}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Speech-to-Text Voice Input
  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please use Chrome/Edge.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        if (addToast) addToast("Listening 🎙️", "Speak your question clearly...", "info");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    try {
      await api.saveAIKey(keyInput.trim());
      setApiKey(keyInput.trim());
      setShowKeyModal(false);
      if (addToast) addToast("Gemini AI Connected ⚡", "Google Gemini Live LLM active!", "success");
    } catch (err) {
      alert(err.message || "Invalid API key");
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "🧹 **Chat cleared!** What would you like to learn or solve next?"
      }
    ]);
  };

  const quickPrompts = [
    { label: "📅 Plan Today's Study Schedule", text: "Create a personalized study timetable for today based on my upcoming exams and tasks." },
    { label: "📊 Analyze My Attendance & Bunks", text: "Analyze my attendance and calculate how many classes I can safely miss or need to attend." },
    { label: "🔍 Binary Search in Python", text: "Explain Binary Search algorithm in Python with code and time complexity." },
    { label: "🗄️ DBMS Normalization (1NF to BCNF)", text: "Explain DBMS Normalization with rules and examples from 1NF to BCNF." },
    { label: "💻 OS Deadlock Coffman Conditions", text: "Explain 4 Coffman conditions for Deadlock in Operating Systems and prevention methods." },
    { label: "💼 Top Placement Interview Questions", text: "Give me the top technical interview questions and strategy for 5th semester placement preparation." }
  ];

  return (
    <div className="ai-page">
      {/* PAGE HEADER */}
      <div className="ai-header">
        <div>
          <h1>🤖 Universal AI Academic Assistant</h1>
          <p>Instant doubt solving, code generation, exam revision, and live attendance insights.</p>
        </div>

        <div className="ai-header-controls">
          <button
            className="ai-config-btn"
            onClick={() => setShowKeyModal(true)}
            title="Configure Google Gemini API Key"
          >
            ⚙️ {apiKey ? "🟢 Gemini LLM Connected" : "⚡ Built-in Academic AI"}
          </button>

          <button className="clear-chat-btn" onClick={clearChat} title="Clear Chat History">
            🧹 Clear Chat
          </button>
        </div>
      </div>

      {/* QUICK STUDY PROMPT PILLS */}
      <div className="quick-prompts-bar">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            className="quick-prompt-pill"
            onClick={() => handleSend(p.text)}
            disabled={loading}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* CHAT MESSAGES WINDOW */}
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-row ${msg.sender === "user" ? "user-row" : "ai-row"}`}
          >
            <div className="avatar-icon">
              {msg.sender === "user" ? "👤" : "🤖"}
            </div>

            <div className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}>
              <FormattedText
                content={msg.text}
                onCopyCode={() => {
                  if (addToast) addToast("Copied 📋", "Code copied to clipboard!", "info");
                }}
              />

              {msg.sender === "ai" && (
                <div className="bubble-footer">
                  <span className="source-tag">
                    {msg.source ? `⚡ Source: ${msg.source}` : "⚡ Student Life OS Engine"}
                  </span>
                  <button
                    className="copy-msg-btn"
                    onClick={() => {
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(msg.text).catch(() => {});
                      }
                      if (addToast) addToast("Copied 📋", "Response copied to clipboard!", "info");
                    }}
                    title="Copy Answer"
                  >
                    📋 Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row ai-row">
            <div className="avatar-icon">🤖</div>
            <div className="chat-bubble ai-bubble loading-bubble">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <small>Solving & generating academic response...</small>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CHAT INPUT FORM WITH SPEECH-TO-TEXT */}
      <form
        className="chat-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={`mic-btn ${isRecording ? "recording" : ""}`}
          onClick={toggleVoiceRecording}
          title={isRecording ? "Listening... Click to stop" : "Click to speak your doubt"}
        >
          {isRecording ? "🔴" : "🎙️"}
        </button>

        <input
          type="text"
          placeholder={
            isRecording
              ? "Listening... Speak now..."
              : "Ask anything... (e.g. 'Write QuickSort in Python', 'Explain TCP 3-way handshake', 'Plan my study schedule')"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />

        <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
          {loading ? "Thinking..." : "Send 🚀"}
        </button>
      </form>

      {/* GEMINI API KEY MODAL */}
      {showKeyModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>⚡ Connect Google Gemini API Key</h2>
              <button className="close-btn" onClick={() => setShowKeyModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
              Provide your free Google AI Studio API Key to unlock unlimited live Gemini 1.5/2.0 Flash intelligence for any question.
            </p>

            <form onSubmit={handleSaveKey} className="auth-form">
              <div className="form-group">
                <label>Google Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                💡 Don't have a key? Get one free at{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)" }}>
                  aistudio.google.com
                </a>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className="primary-btn">
                  Test & Connect Key
                </button>
                {apiKey && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => {
                      localStorage.removeItem("gemini_api_key");
                      setApiKey("");
                      setShowKeyModal(false);
                    }}
                  >
                    Disconnect Key
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
