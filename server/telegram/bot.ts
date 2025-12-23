import { Bot, Context, session } from "grammy";
import { config } from "../config.js";
import { telegramAuthMiddleware } from "../auth/telegram-auth.js";
import { sessionManager } from "../core/session-manager.js";
import { telegramSubscriptionManager } from "./subscription-manager.js";
import { handleCommand } from "./handlers/command-handler.js";
import { handleMessage } from "./handlers/message-handler.js";
import { handleMedia } from "./handlers/media-handler.js";

// Session data stored per user
interface SessionData {
  currentSessionName: string;
}

// Extend context with session
type MyContext = Context & { session: SessionData };

// Create bot instance
const bot = new Bot<MyContext>(config.telegramBotToken);

// Session middleware
bot.use(
  session({
    initial: (): SessionData => ({
      currentSessionName: "default",
    }),
  })
);

// Auth middleware - only allow configured user
bot.use(telegramAuthMiddleware);

// Command handlers
bot.command("start", async (ctx) => {
  await ctx.reply(
    `Welcome to MyAgentive!

Commands:
/session <name> - Switch to a named session
/new [name] - Create a new session
/list - List all sessions
/status - Show current session
/help - Show this help message

Send any message to chat with the agent.`
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `MyAgentive Commands:

📂 Sessions:
/session <name> - Switch to a named session
/new [name] - Create a new session
/list - List all sessions
/status - Show current session info

🤖 Models:
/usage - Show API or subscription usage
/model - Show current model
/model <opus|sonnet|haiku> - Change model

📎 Media:
Send voice, files, videos, photos - they're saved and accessible by the agent.

/help - Show this message`
  );
});

bot.command("session", handleCommand);
bot.command("new", handleCommand);
bot.command("list", handleCommand);
bot.command("status", handleCommand);
bot.command("usage", handleCommand);
bot.command("model", handleCommand);

// Media handlers (skip monitoring group)
bot.on("message:voice", async (ctx) => {
  if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
  await handleMedia(ctx);
});
bot.on("message:audio", async (ctx) => {
  if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
  await handleMedia(ctx);
});
bot.on("message:document", async (ctx) => {
  if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
  await handleMedia(ctx);
});
bot.on("message:video", async (ctx) => {
  if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
  await handleMedia(ctx);
});
bot.on("message:photo", async (ctx) => {
  if (ctx.chat?.id === config.telegramMonitoringGroupId) return;
  await handleMedia(ctx);
});

// Text message handler (must be last)
bot.on("message:text", async (ctx) => {
  // Skip if it's a command (already handled)
  if (ctx.message.text.startsWith("/")) {
    return;
  }

  // Skip messages from the monitoring group - it's for logging only
  if (ctx.chat?.id === config.telegramMonitoringGroupId) {
    return;
  }

  await handleMessage(ctx);
});

// Error handler - catches all errors and prevents bot from crashing
bot.catch((err) => {
  const error = err.error;
  const ctx = err.ctx;

  // Log error details
  console.error(`Telegram bot error in ${ctx?.update?.update_id || 'unknown'}:`);

  // Handle specific error types
  if (error && typeof error === 'object' && 'error_code' in error) {
    const grammyError = error as { error_code: number; description: string; parameters?: { retry_after?: number } };

    if (grammyError.error_code === 429) {
      // Rate limiting - log and wait
      const retryAfter = grammyError.parameters?.retry_after || 30;
      console.warn(`Rate limited by Telegram. Retry after ${retryAfter} seconds.`);
      return; // Don't re-throw, just continue
    }

    if (grammyError.error_code === 403) {
      // Bot blocked or chat not found
      console.warn(`Telegram API 403: ${grammyError.description}`);
      return;
    }

    if (grammyError.error_code === 400) {
      // Bad request - usually formatting issues
      console.warn(`Telegram API 400: ${grammyError.description}`);
      return;
    }

    console.error(`Telegram API error ${grammyError.error_code}: ${grammyError.description}`);
  } else {
    console.error("Unknown bot error:", error);
  }

  // Don't re-throw the error - this would crash the bot
  // The error is logged and the bot continues running
});

// Start function
export async function startTelegramBot(): Promise<void> {
  console.log("Starting Telegram bot...");

  // Set bot instance on subscription manager for persistent subscriptions
  telegramSubscriptionManager.setBot(bot);

  await bot.start({
    onStart: (botInfo) => {
      console.log(`Telegram bot started: @${botInfo.username}`);
    },
  });
}

// Stop function for graceful shutdown
export async function stopTelegramBot(): Promise<void> {
  console.log("Stopping Telegram bot...");
  await bot.stop();
}

// Export bot instance for monitoring
export { bot };
