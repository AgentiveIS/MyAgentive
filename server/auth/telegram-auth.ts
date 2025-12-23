import type { Context, NextFunction } from "grammy";
import { config } from "../config.js";

/**
 * Check if the bot is mentioned in the message.
 * Works for @username mentions and text_mention entities.
 */
function isBotMentioned(ctx: Context): boolean {
  const message = ctx.message || ctx.channelPost;
  if (!message) return false;

  const botUsername = ctx.me?.username?.toLowerCase();
  if (!botUsername) return false;

  // Check message text for @mention
  const text = message.text || message.caption || "";
  if (text.toLowerCase().includes(`@${botUsername}`)) {
    return true;
  }

  // Check entities for mentions
  const entities = message.entities || message.caption_entities || [];
  for (const entity of entities) {
    if (entity.type === "mention") {
      // Extract the mentioned username from text
      const mentionText = text.substring(entity.offset, entity.offset + entity.length);
      if (mentionText.toLowerCase() === `@${botUsername}`) {
        return true;
      }
    }
    if (entity.type === "text_mention" && entity.user?.id === ctx.me?.id) {
      return true;
    }
  }

  return false;
}

/**
 * Telegram auth middleware for Grammy.
 *
 * - Private chats: Only allow the configured user ID
 * - Groups/Channels: Only process if in allowed list AND bot is @mentioned
 * - Monitoring group: Always ignored (it's for posting only)
 */
export async function telegramAuthMiddleware(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  // Skip messages from the monitoring group entirely (it's for posting only)
  if (chatId === config.telegramMonitoringGroupId) {
    return;
  }

  // Check if this is a group or channel (negative chat ID)
  const isGroupOrChannel = chatId !== undefined && chatId < 0;

  if (isGroupOrChannel) {
    // For groups/channels: must be in allowed list AND bot must be mentioned
    const isAllowed = config.telegramAllowedGroups.includes(chatId);

    if (!isAllowed) {
      // Not in allowed list - silently ignore
      return;
    }

    if (!isBotMentioned(ctx)) {
      // In allowed group but bot not mentioned - silently ignore
      return;
    }

    // Bot is mentioned in an allowed group - proceed
    // Note: We don't check userId here because anyone in the group can mention the bot
    await next();
    return;
  }

  // Private chat - check if user is authorised
  if (!userId || userId !== config.telegramUserId) {
    console.log(`Unauthorized Telegram user attempted access: ${userId}`);
    try {
      await ctx.reply("Unauthorised. This bot is for private use only.");
    } catch (error) {
      // Silently ignore reply errors (e.g., rate limiting)
      console.error("Failed to send unauthorised message:", error);
    }
    return;
  }

  await next();
}

// Check if a user ID is authorised (for use outside middleware)
export function isAuthorisedTelegramUser(userId: number): boolean {
  return userId === config.telegramUserId;
}
