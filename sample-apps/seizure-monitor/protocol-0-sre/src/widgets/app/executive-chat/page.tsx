"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  answeredBy?: string;
  relatedIncidents?: string[];
  mode?: "live" | "mock";
}

interface ExecutiveResponse {
  question: string;
  answer: string;
  relatedIncidents: string[];
  answeredBy: string;
}

const SUGGESTIONS = [
  "Why is engineering health low?",
  "Summarize today's risks",
  "Which department is under the most pressure?",
  "Check release calendar conflicts",
];

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export default function ExecutiveChatWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<ExecutiveResponse>();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "assistant",
      text: 'Hello. I am the Executive Copilot Agent. Ask me operational questions like "Why is engineering health low?", "Summarize today\'s risks", etc.',
      timestamp: new Date().toISOString(),
      answeredBy: "Executive Agent",
      mode: "mock",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Sync tool executions from the sidebar directly into the chat
  const lastProcessedQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (rawData && rawData.question && rawData.question !== lastProcessedQuestionRef.current) {
      lastProcessedQuestionRef.current = rawData.question;
      
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user-sync`,
        sender: "user",
        text: rawData.question,
        timestamp: new Date().toISOString(),
      };
      
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant-sync`,
        sender: "assistant",
        text: rawData.answer,
        timestamp: new Date().toISOString(),
        answeredBy: rawData.answeredBy || "Incident Commander Agent",
        relatedIncidents: rawData.relatedIncidents || [],
        mode: "live",
      };

      setMessages((prev) => {
        const exists = prev.some(
          (m) => m.sender === "user" && m.text === rawData.question
        );
        if (exists) return prev;
        return [...prev, userMsg, assistantMsg];
      });
    }
  }, [rawData]);

  const getLocalMockAnswer = (question: string) => {
    const q = question.toLowerCase();
    if (
      q.includes("engineering") &&
      (q.includes("low") || q.includes("why") || q.includes("health"))
    ) {
      return {
        answer:
          "Engineering health is currently 74% (warning). Database deployment failed on primary checkout service. Active incidents are processed by the Engineering Agent to diagnose root causes and suggest mitigations.",
        relatedIncidents: ["INC-1004"],
        answeredBy: "Executive Agent",
      };
    }
    if (
      q.includes("release") ||
      q.includes("launch") ||
      q.includes("meeting")
    ) {
      return {
        answer:
          "We currently monitor calendar meetings and release windows. Open incidents will block or delay launch events if feature progress falls under 80%. I recommend postponing demo reviews or resolving the underlying database migrations if active.",
        relatedIncidents: ["INC-1004"],
        answeredBy: "Executive Agent",
      };
    }
    if (q.includes("pressure") || q.includes("most") || q.includes("worst")) {
      return {
        answer:
          "Engineering is under the most pressure at 74% (warning). Database deployment failed on primary checkout service.",
        relatedIncidents: ["INC-1004"],
        answeredBy: "Executive Agent",
      };
    }
    if (q.includes("risk") || q.includes("summar")) {
      return {
        answer:
          "Company health is 82% (warning) with 1 open incident. Active alerts: Failed Production Database Rollout (critical).",
        relatedIncidents: ["INC-1004"],
        answeredBy: "Executive Agent",
      };
    }
    return {
      answer:
        "Company health is 82% (warning). There is 1 open incident. Ask me about a department's health, meeting risk, or general operational risks.",
      relatedIncidents: ["INC-1004"],
      answeredBy: "Executive Agent",
    };
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      let result: ExecutiveResponse;
      let mode: "live" | "mock" = "live";

      try {
        result = (await callTool("executiveChat", {
          question: textToSend,
        })) as unknown as ExecutiveResponse;
        if (!result || !result.answer) {
          throw new Error("Empty response payload received from executiveChat tool");
        }
      } catch (err) {
        console.warn(
          "Live tool call failed or running standalone. Falling back to local mock.",
          err
        );
        const mock = getLocalMockAnswer(textToSend);
        result = {
          question: textToSend,
          answer: mock.answer,
          relatedIncidents: mock.relatedIncidents,
          answeredBy: mock.answeredBy,
        };
        mode = "mock";
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: "assistant",
        text: result.answer,
        timestamp: new Date().toISOString(),
        answeredBy: result.answeredBy,
        relatedIncidents: result.relatedIncidents,
        mode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: "assistant",
        text: "❌ Error: Failed to retrieve answer from Executive Copilot.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          color: TEXT,
          background: BG,
          borderRadius: 16,
          fontFamily: FONT,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div className="spinner" style={{ marginBottom: 16, margin: "0 auto" }} />
        <div style={{ fontSize: 15, color: MUTED }}>Initializing Executive Copilot Room...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        padding: 24,
        borderRadius: 16,
        fontFamily: FONT,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        height: 540,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "1.2px",
              color: "#38bdf8",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Executive Agent Copilot
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              marginTop: 4,
              letterSpacing: "-0.5px",
            }}
          >
            Strategic Advisory Room
          </div>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: 999,
            background: "#1c2230",
            color: "#38bdf8",
            fontSize: 10,
            fontWeight: 800,
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}
        >
          LIVE CHAT
        </div>
      </div>

      {/* Suggested Questions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 10,
          flexShrink: 0,
        }}
      >
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: CARD,
              border: `1px solid ${BORDER}`,
              color: TEXT,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#38bdf8";
              e.currentTarget.style.background = "#1c2230";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.background = CARD;
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          margin: "12px 0",
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  background: isUser ? "#1c2230" : CARD,
                  color: TEXT,
                  borderRadius: isUser
                    ? "16px 16px 2px 16px"
                    : "16px 16px 16px 2px",
                  padding: "12px 16px",
                  border: `1px solid ${isUser ? "#38bdf8" : BORDER}`,
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                      fontSize: 10,
                      color: MUTED,
                      fontWeight: 700,
                    }}
                  >
                    <span>{m.answeredBy ?? "Copilot"}</span>
                    {m.mode === "mock" && (
                      <span
                        style={{
                          background: "#1e1e1e",
                          color: "#888888",
                          padding: "1px 4px",
                          borderRadius: 3,
                          fontSize: 8,
                          fontWeight: 900,
                        }}
                      >
                        MOCK
                      </span>
                    )}
                  </div>
                )}
                
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>

                {!isUser && m.relatedIncidents && m.relatedIncidents.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 6,
                      borderTop: `1px solid ${BORDER}`,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>
                      Incidents:
                    </span>
                    {m.relatedIncidents.map((incId) => (
                      <span
                        key={incId}
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          background: "#1c2230",
                          color: "#38bdf8",
                          borderRadius: 4,
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          fontWeight: 500,
                        }}
                      >
                        {incId}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    textAlign: "right",
                    fontSize: 9,
                    color: MUTED,
                    marginTop: 6,
                  }}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                background: CARD,
                color: TEXT,
                borderRadius: "16px 16px 16px 2px",
                padding: "12px 16px",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: MUTED,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span className="spinner-dots" style={{ fontSize: 16 }}>
                  ●
                </span>
                <span>Executive Agent is formulating report...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        style={{ display: "flex", gap: 10, flexShrink: 0 }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask the executive advisor..."
          disabled={loading}
          style={{
            flex: 1,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: TEXT,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            background: "#ffffff",
            color: "#121722",
            border: "none",
            borderRadius: 10,
            padding: "0 20px",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            transition: "opacity 0.2s",
            opacity: loading || !inputValue.trim() ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
