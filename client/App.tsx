import { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ChatWindow } from "./components/ChatWindow";
import { LoginForm } from "./components/LoginForm";
import { Sidebar } from "./components/Sidebar";
import { useAuth } from "./hooks/useAuth";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

// Use relative URLs - Vite will proxy to the backend
const API_BASE = "/api";

function getWSUrl(token: string | null): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  // Use same host - Vite proxy handles WebSocket forwarding in dev mode
  return `${protocol}//${host}/ws${token ? `?token=${token}` : ""}`;
}

export default function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<Session[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    // Load token from localStorage on initial mount
    return localStorage.getItem("sessionToken");
  });

  // Handle login with token
  const handleLogin = useCallback((token: string) => {
    localStorage.setItem("sessionToken", token);
    setSessionToken(token);
    checkAuth();
  }, [checkAuth]);

  // Clear token on logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("sessionToken");
    setSessionToken(null);
    logout();
  }, [logout]);

  // Handle WebSocket messages
  const handleWSMessage = useCallback((message: any) => {
    switch (message.type) {
      case "connected":
        console.log("Connected to server");
        break;

      case "history":
        setMessages(
          (message.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        );
        break;

      case "user_message":
        // Only add messages from other sources (e.g., Telegram)
        // Local web messages are already added optimistically
        if (message.source && message.source !== "web") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "user",
              content: `[${message.source === "telegram" ? "Telegram" : message.source}] ${message.content}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(true);
        }
        break;

      case "assistant_message":
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: message.content,
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        break;

      case "tool_use":
        setMessages((prev) => [
          ...prev,
          {
            id: message.toolId,
            role: "tool_use",
            content: "",
            timestamp: new Date().toISOString(),
            toolName: message.toolName,
            toolInput: message.toolInput,
          },
        ]);
        break;

      case "result":
        setIsLoading(false);
        fetchSessions();
        break;

      case "session_switched":
        setCurrentSessionName(message.sessionName);
        break;

      case "error":
        console.error("Server error:", message.error);
        setIsLoading(false);
        break;
    }
  }, []);

  const wsUrl = sessionToken ? getWSUrl(sessionToken) : null;

  const { sendJsonMessage, readyState, lastJsonMessage } = useWebSocket(
    wsUrl,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    },
    !!sessionToken
  );

  const isConnected = readyState === ReadyState.OPEN;

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastJsonMessage) {
      handleWSMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, handleWSMessage]);

  // Fetch all sessions (active and archived)
  const fetchSessions = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch(`${API_BASE}/sessions`, { credentials: "include" }),
        fetch(`${API_BASE}/sessions?archived=1`, { credentials: "include" }),
      ]);
      if (activeRes.ok) {
        setSessions(await activeRes.json());
      }
      if (archivedRes.ok) {
        setArchivedSessions(await archivedRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  // Create new session
  const createSession = async (name?: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const session = await res.json();
      await fetchSessions();
      switchSession(session.name);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // Delete session
  const deleteSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchSessions();
      if (currentSessionName === name) {
        setCurrentSessionName(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // Archive session
  const archiveSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: true }),
      });
      await fetchSessions();
      // If we archived the current session, switch to the next active one
      if (currentSessionName === name) {
        const remainingActive = sessions.filter((s) => s.name !== name);
        if (remainingActive.length > 0) {
          switchSession(remainingActive[0].name);
        } else {
          setCurrentSessionName(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to archive session:", error);
    }
  };

  // Unarchive session
  const unarchiveSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: false }),
      });
      await fetchSessions();
    } catch (error) {
      console.error("Failed to unarchive session:", error);
    }
  };

  // Switch to a session
  const switchSession = (name: string) => {
    setCurrentSessionName(name);
    setMessages([]);
    setIsLoading(false);

    if (isConnected) {
      sendJsonMessage({ type: "subscribe", sessionName: name });
    }
  };

  // Send a message
  const handleSendMessage = (content: string) => {
    if (!currentSessionName || !isConnected) return;

    // Add message optimistically
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsLoading(true);

    sendJsonMessage({
      type: "chat",
      content,
      sessionName: currentSessionName,
    });
  };

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  // Auto-select first session or create default
  useEffect(() => {
    if (isAuthenticated && sessions.length > 0 && !currentSessionName) {
      switchSession(sessions[0].name);
    } else if (isAuthenticated && sessions.length === 0 && isConnected) {
      createSession("default");
    }
  }, [isAuthenticated, sessions, currentSessionName, isConnected]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const selectedChatId = sessions.find((s) => s.name === currentSessionName)?.id || null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <Sidebar
          sessions={sessions}
          archivedSessions={archivedSessions}
          currentSessionName={currentSessionName}
          onSwitchSession={switchSession}
          onNewSession={createSession}
          onArchiveSession={archiveSession}
          onUnarchiveSession={unarchiveSession}
          onDeleteSession={deleteSession}
          onLogout={handleLogout}
        />
      </div>

      {/* Main chat area */}
      <ChatWindow
        chatId={selectedChatId}
        messages={messages}
        isConnected={isConnected}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
