import { useState } from "react";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface SidebarProps {
  sessions: Session[];
  archivedSessions: Session[];
  currentSessionName: string | null;
  onSwitchSession: (name: string) => void;
  onNewSession: (name?: string) => void;
  onArchiveSession: (name: string) => void;
  onUnarchiveSession: (name: string) => void;
  onDeleteSession: (name: string) => void;
  onLogout: () => void;
}

type TabType = "active" | "archived";

export function Sidebar({
  sessions,
  archivedSessions,
  currentSessionName,
  onSwitchSession,
  onNewSession,
  onArchiveSession,
  onUnarchiveSession,
  onDeleteSession,
  onLogout,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      const slug = newSessionName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      onNewSession(slug);
      setNewSessionName("");
    } else {
      onNewSession();
    }
    setShowNewInput(false);
  };

  const displayedSessions = activeTab === "active" ? sessions : archivedSessions;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium">MyAgentive</span>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>

      {/* New Session Button */}
      {activeTab === "active" && (
        <div className="p-3 border-b border-gray-700">
          {showNewInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Session name (optional)"
                className="flex-1 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSession();
                  if (e.key === "Escape") {
                    setShowNewInput(false);
                    setNewSessionName("");
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCreateSession}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span>+</span>
              <span>New Session</span>
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
            activeTab === "active"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
            activeTab === "archived"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Archived {archivedSessions.length > 0 && `(${archivedSessions.length})`}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayedSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">
              {activeTab === "active" ? "No active sessions" : "No archived sessions"}
            </p>
            {activeTab === "active" && (
              <p className="text-xs mt-1">Click "New Session" to start</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentSessionName === session.name
                    ? "bg-blue-600"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => onSwitchSession(session.name)}
              >
                <span className="text-gray-400 shrink-0">
                  {activeTab === "active" ? "💬" : "📦"}
                </span>
                <span className="flex-1 truncate text-sm">
                  {session.title || session.name}
                </span>

                {/* Action buttons */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {activeTab === "active" ? (
                    /* Archive button for active sessions */
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveSession(session.name);
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                      title="Archive"
                    >
                      📥
                    </button>
                  ) : (
                    /* Restore and Delete buttons for archived sessions */
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnarchiveSession(session.name);
                        }}
                        className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                        title="Restore"
                      >
                        ↩
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this session permanently?")) {
                            onDeleteSession(session.name);
                          }
                        }}
                        className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
                        title="Delete permanently"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          <a href="https://TheAgentiveGroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Agentive</a>
          {" "}
          <a href="https://MyAgentive.ai" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">MyAgentive</a>
        </p>
      </div>
    </div>
  );
}
