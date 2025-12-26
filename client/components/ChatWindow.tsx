import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

// Media detection types
type MediaType = "audio" | "video" | "image" | "document";

interface DetectedMedia {
  type: MediaType;
  filename: string;
  webUrl: string;
}

// Map file extensions to media types
const EXTENSION_TO_TYPE: Record<string, MediaType> = {
  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".aac": "audio",
  ".ogg": "audio",
  ".oga": "audio",
  ".flac": "audio",
  // Video
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".avi": "video",
  ".mkv": "video",
  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".webp": "image",
  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".txt": "document",
  ".csv": "document",
  ".xlsx": "document",
};

/**
 * Detect media file paths in message content.
 * Supports both absolute paths (containing /media/) and relative paths (starting with media/).
 */
function detectMediaPaths(content: string): DetectedMedia[] {
  const detected: DetectedMedia[] = [];
  const seenUrls = new Set<string>();

  // Pattern 1: Absolute paths containing /media/
  // Matches: /home/user/.myagentive/media/audio/file.mp3
  const absolutePathRegex = /\/[^\s]+\/media\/([^\s]+\.[a-zA-Z0-9]+)/g;

  // Pattern 2: Relative paths starting with "media/"
  // Matches: media/audio/file.mp3 or ./media/audio/file.mp3
  // Also handles markdown formatting like `media/...` or **`media/...`**
  const relativePathRegex = /(?:^|[\s:`*])\.?\/?(media\/[\w./-]+\.[a-zA-Z0-9]+)/g;

  // Process absolute path matches
  for (const match of content.matchAll(absolutePathRegex)) {
    const relativePath = match[1];
    const webUrl = `/api/media/${relativePath}`;

    if (seenUrls.has(webUrl)) continue;
    seenUrls.add(webUrl);

    const ext = relativePath.substring(relativePath.lastIndexOf(".")).toLowerCase();
    const filename = relativePath.split("/").pop() || relativePath;
    const type = EXTENSION_TO_TYPE[ext] || "document";

    detected.push({ type, filename, webUrl });
  }

  // Process relative path matches
  for (const match of content.matchAll(relativePathRegex)) {
    const fullRelativePath = match[1]; // e.g., "media/audio/file.mp3"
    const relativePath = fullRelativePath.replace(/^media\//, ""); // strip "media/" prefix
    const webUrl = `/api/media/${relativePath}`;

    if (seenUrls.has(webUrl)) continue;
    seenUrls.add(webUrl);

    const ext = relativePath.substring(relativePath.lastIndexOf(".")).toLowerCase();
    const filename = relativePath.split("/").pop() || relativePath;
    const type = EXTENSION_TO_TYPE[ext] || "document";

    detected.push({ type, filename, webUrl });
  }

  return detected;
}

/**
 * Render detected media inline
 */
function MediaRenderer({ media }: { media: DetectedMedia }) {
  switch (media.type) {
    case "audio":
      return (
        <div className="mt-3 p-3 bg-gray-100 rounded-lg">
          <div className="text-xs text-gray-500 mb-2">{media.filename}</div>
          <audio controls className="w-full">
            <source src={media.webUrl} />
            Your browser does not support audio playback.
          </audio>
          <a
            href={media.webUrl}
            download={media.filename}
            className="inline-block mt-2 text-xs text-blue-600 hover:underline"
          >
            Download
          </a>
        </div>
      );
    case "video":
      return (
        <div className="mt-3">
          <video controls className="w-full max-w-lg rounded-lg">
            <source src={media.webUrl} />
            Your browser does not support video playback.
          </video>
          <a
            href={media.webUrl}
            download={media.filename}
            className="inline-block mt-1 text-xs text-blue-600 hover:underline"
          >
            Download {media.filename}
          </a>
        </div>
      );
    case "image":
      return (
        <div className="mt-3">
          <img
            src={media.webUrl}
            alt={media.filename}
            className="max-w-md rounded-lg shadow-sm"
          />
          <a
            href={media.webUrl}
            download={media.filename}
            className="inline-block mt-1 text-xs text-blue-600 hover:underline"
          >
            Download {media.filename}
          </a>
        </div>
      );
    case "document":
    default:
      return (
        <a
          href={media.webUrl}
          download={media.filename}
          className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-blue-600 hover:bg-gray-200"
        >
          <span>📎</span>
          <span>{media.filename}</span>
        </a>
      );
  }
}

interface ChatWindowProps {
  chatId: string | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

function ToolUseBlock({ message }: { message: Message }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolSummary = () => {
    const input = message.toolInput || {};
    switch (message.toolName) {
      case "Read":
        return input.file_path;
      case "Write":
      case "Edit":
        return input.file_path;
      case "Bash":
        return input.command?.slice(0, 60) + (input.command?.length > 60 ? "..." : "");
      case "Grep":
        return `"${input.pattern}" in ${input.path || "."}`;
      case "Glob":
        return input.pattern;
      case "WebSearch":
        return input.query;
      case "WebFetch":
        return input.url;
      default:
        return JSON.stringify(input).slice(0, 50);
    }
  };

  return (
    <div className="my-2 border border-gray-200 bg-gray-50 rounded">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 flex items-center justify-between text-left hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase">
            {message.toolName}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-md">
            {getToolSummary()}
          </span>
        </div>
        <span className="text-xs text-gray-400">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && (
        <div className="p-2 border-t border-gray-200">
          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
            {JSON.stringify(message.toolInput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  // Detect media files in assistant messages
  const mediaFiles = useMemo(() => {
    if (isUser) return [];
    return detectMediaPaths(message.content);
  }, [message.content, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-600 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                components={{
                  // Code blocks
                  pre: ({ children }) => (
                    <pre className="overflow-x-auto p-3 rounded-md bg-gray-800 text-gray-100 text-sm">
                      {children}
                    </pre>
                  ),
                  // Inline code
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return <code className={className} {...props}>{children}</code>;
                    }
                    return (
                      <code className="bg-gray-200 text-pink-600 px-1 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {/* Render detected media files */}
            {mediaFiles.map((media, index) => (
              <MediaRenderer key={`${media.webUrl}-${index}`} media={media} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function ChatWindow({
  chatId,
  messages,
  isConnected,
  isLoading,
  onSendMessage,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId || isLoading || !isConnected) return;
    onSendMessage(input.trim());
    setInput("");
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">Welcome to Simple Chat</p>
          <p className="text-sm mt-2">Select a chat or create a new one to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Chat</h2>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="text-xs text-green-600">● Connected</span>
          ) : (
            <span className="text-xs text-red-600">○ Disconnected</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>Start a conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "tool_use" ? (
                <ToolUseBlock key={msg.id} message={msg} />
              ) : (
                <MessageBubble key={msg.id} message={msg} />
              )
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="animate-pulse">●</span>
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected || isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isConnected || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
