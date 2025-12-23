import type { Context } from "grammy";
import { sessionManager } from "../../core/session-manager.js";
import { telegramSubscriptionManager } from "../subscription-manager.js";

interface SessionData {
  currentSessionName: string;
}

type MyContext = Context & { session: SessionData };

export async function handleMessage(ctx: MyContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const sessionName = ctx.session.currentSessionName;

  // Ensure user is subscribed to the session (for persistent updates)
  if (!telegramSubscriptionManager.isSubscribed(chatId) ||
      telegramSubscriptionManager.getSessionName(chatId) !== sessionName) {
    telegramSubscriptionManager.subscribe(chatId, sessionName);
  }

  // Send "typing" indicator
  await ctx.replyWithChatAction("typing");

  // Create a placeholder message for the response
  const placeholder = await ctx.reply("Thinking...");

  // Start active response tracking (for message editing)
  telegramSubscriptionManager.startActiveResponse(chatId, placeholder.message_id);

  try {
    // Get the session and send the message
    const session = sessionManager.getOrCreateSession(sessionName, "telegram");
    session.sendMessage(text, "telegram");
  } catch (error) {
    console.error("Error handling Telegram message:", error);
    await ctx.api.editMessageText(
      chatId,
      placeholder.message_id,
      `Error: ${(error as Error).message}`
    );
  }
}
