'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Memory {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: string;
  tags: string[];
  relevanceScore: number;
  sourceModel: string;
}

interface ChatMessage {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: string;
  tags: string[];
  sourceModel: string;
}

interface ConversationData {
  success: boolean;
  conversation?: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    avatarUrl?: string;
  };
  messages?: ChatMessage[];
  memories?: Memory[];
  response?: string;
  contextUsed?: number;
  count?: number;
  error?: string;
}

export default function ChatWindow() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<ConversationData>();

  if (!isReady) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        Loading...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const hoverBg = isDark ? '#2a2a2a' : '#f9fafb';

  // Determine what to display based on tool output
  const isMemoryRetrievalResult = data.memories && data.count !== undefined;
  const isSendMessageResult = data.response !== undefined;
  const isConversationListResult = data.messages && data.conversation;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: bgColor,
        color: textColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {data.conversation?.avatarUrl && (
            <img
              src={data.conversation.avatarUrl}
              alt="Avatar"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              {data.conversation?.title || 'Conversation'}
            </h2>
            {data.conversation && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: mutedColor }}>
                {data.conversation.messageCount} messages
              </p>
            )}
          </div>
        </div>
        {data.contextUsed !== undefined && (
          <div
            style={{
              padding: '6px 12px',
              background: isDark ? '#2a2a2a' : '#f0f0f0',
              borderRadius: '6px',
              fontSize: '12px',
              color: mutedColor,
            }}
          >
            📚 {data.contextUsed} memories used
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Memory Retrieval Results */}
        {isMemoryRetrievalResult && (
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
              📚 Retrieved Memories ({data.count})
            </h3>
            {data.memories && data.memories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.memories.map((memory, idx) => (
                  <div
                    key={memory.id}
                    style={{
                      padding: '12px',
                      background: hoverBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>Memory {idx + 1}</span>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            padding: '2px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {(memory.relevanceScore * 100).toFixed(0)}%
                        </span>
                        <span style={{ color: mutedColor, fontSize: '11px' }}>
                          {memory.sourceModel}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ margin: '0 0 4px 0', color: mutedColor, fontSize: '11px' }}>
                        User:
                      </p>
                      <p style={{ margin: 0, lineHeight: '1.4' }}>
                        {memory.userMessage}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: mutedColor, fontSize: '11px' }}>
                        Assistant:
                      </p>
                      <p style={{ margin: 0, lineHeight: '1.4' }}>
                        {memory.aiResponse}
                      </p>
                    </div>
                    {memory.tags && memory.tags.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {memory.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: '2px 6px',
                              background: isDark ? '#333333' : '#e5e7eb',
                              borderRadius: '3px',
                              fontSize: '10px',
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: mutedColor, fontSize: '13px' }}>
                No relevant memories found.
              </p>
            )}
          </div>
        )}

        {/* Send Message Result */}
        {isSendMessageResult && (
          <div>
            <div
              style={{
                padding: '12px',
                background: isDark ? '#2a2a2a' : '#f0f0f0',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <p style={{ margin: '0 0 4px 0', color: mutedColor, fontSize: '11px' }}>
                Assistant Response:
              </p>
              <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
                {data.response}
              </p>
            </div>
            {data.contextUsed !== undefined && data.contextUsed > 0 && (
              <p style={{ margin: 0, fontSize: '12px', color: mutedColor }}>
                ✓ Response generated using {data.contextUsed} retrieved memories
              </p>
            )}
          </div>
        )}

        {/* Conversation History */}
        {isConversationListResult && data.messages && (
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
              💬 Conversation History
            </h3>
            {data.messages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.messages.map((msg) => (
                  <div key={msg.id}>
                    {/* User Message */}
                    <div
                      style={{
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '80%',
                          padding: '12px',
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '13px',
                          lineHeight: '1.4',
                        }}
                      >
                        {msg.userMessage}
                      </div>
                    </div>

                    {/* AI Response */}
                    <div
                      style={{
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '80%',
                          padding: '12px',
                          background: hoverBg,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '12px',
                          fontSize: '13px',
                          lineHeight: '1.4',
                        }}
                      >
                        {msg.aiResponse}
                      </div>
                    </div>

                    {/* Message Metadata */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        fontSize: '11px',
                        color: mutedColor,
                        marginBottom: '12px',
                      }}
                    >
                      <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{msg.sourceModel}</span>
                      {msg.tags && msg.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{msg.tags.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: mutedColor, fontSize: '13px' }}>
                No messages in this conversation yet.
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {data.error && (
          <div
            style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            ⚠️ {data.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${borderColor}`,
          fontSize: '11px',
          color: mutedColor,
          textAlign: 'center',
        }}
      >
        Shared Memory Engine • Powered by NitroStack
      </div>
    </div>
  );
}
