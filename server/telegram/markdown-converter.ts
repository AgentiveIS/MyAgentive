/**
 * Converts standard Markdown to Telegram MarkdownV2 format.
 *
 * Telegram MarkdownV2 requires escaping these characters outside of code:
 * _ * [ ] ( ) ~ ` > # + - = | { } . !
 *
 * This converter handles:
 * - Bold: **text** or __text__ → *text*
 * - Italic: *text* or _text_ → _text_
 * - Code: `code` → `code`
 * - Code blocks: ```code``` → ```code```
 * - Links: [text](url) → [text](url) (with proper escaping)
 * - Strips unsupported elements (headers become plain text)
 */

// Characters that need escaping in Telegram MarkdownV2 (outside code blocks)
const ESCAPE_CHARS = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', '\\'];

/**
 * Escape a single character for Telegram MarkdownV2
 */
function escapeChar(char: string): string {
  return '\\' + char;
}

/**
 * Escape all special characters in plain text for Telegram MarkdownV2
 */
function escapeText(text: string): string {
  let result = '';
  for (const char of text) {
    if (ESCAPE_CHARS.includes(char)) {
      result += escapeChar(char);
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Convert standard markdown to Telegram MarkdownV2 format.
 * Returns plain text if conversion fails or content is too complex.
 */
export function convertToTelegramMarkdown(text: string): { content: string; parseMode: "MarkdownV2" | undefined } {
  try {
    // Use unique placeholders that won't appear in normal text
    const PLACEHOLDER_PREFIX = '\x00PH';
    const placeholders: Map<string, string> = new Map();
    let placeholderCount = 0;

    const addPlaceholder = (content: string): string => {
      const key = `${PLACEHOLDER_PREFIX}${placeholderCount++}\x00`;
      placeholders.set(key, content);
      return key;
    };

    let result = text;

    // Step 1: Extract and protect code blocks (```...```)
    // These should not be escaped at all
    result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const telegramBlock = lang
        ? '```' + lang + '\n' + code.trimEnd() + '```'
        : '```\n' + code.trimEnd() + '```';
      return addPlaceholder(telegramBlock);
    });

    // Step 2: Extract and protect inline code (`...`)
    // Content inside backticks should not be escaped
    result = result.replace(/`([^`]+)`/g, (_, code) => {
      return addPlaceholder('`' + code + '`');
    });

    // Step 3: Extract and protect links [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
      // Link text needs escaping, URL needs ) escaped
      const escapedText = escapeText(linkText);
      const escapedUrl = url.replace(/\)/g, '\\)').replace(/\\/g, '\\\\');
      return addPlaceholder(`[${escapedText}](${escapedUrl})`);
    });

    // Step 4: Convert markdown formatting to Telegram format
    // Bold: **text** → *text*
    result = result.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
      return addPlaceholder('*' + escapeText(content) + '*');
    });

    // Bold: __text__ → *text*
    result = result.replace(/__([^_]+)__/g, (_, content) => {
      return addPlaceholder('*' + escapeText(content) + '*');
    });

    // Italic: *text* → _text_ (single asterisks, not double)
    // Use negative lookbehind/ahead to avoid matching ** or already-processed
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, content) => {
      // Don't convert if it looks like it might be a bullet point
      if (content.trim().length === 0) return '*' + content + '*';
      return addPlaceholder('_' + escapeText(content) + '_');
    });

    // Italic: _text_ → _text_ (single underscores)
    // Be careful not to match things like variable_names_with_underscores
    result = result.replace(/(?<=\s|^)_([^_\s][^_]*)_(?=\s|$|[.,!?])/g, (_, content) => {
      return addPlaceholder('_' + escapeText(content) + '_');
    });

    // Strikethrough: ~~text~~ → ~text~
    result = result.replace(/~~([^~]+)~~/g, (_, content) => {
      return addPlaceholder('~' + escapeText(content) + '~');
    });

    // Step 5: Handle blockquotes: > text
    result = result.replace(/^>\s*(.+)$/gm, (_, content) => {
      return addPlaceholder('>' + escapeText(content));
    });

    // Step 6: Strip markdown headers (# Heading → Heading)
    result = result.replace(/^#{1,6}\s+(.+)$/gm, '$1');

    // Step 7: Escape all remaining special characters in plain text
    // Process character by character, skipping placeholders
    let escaped = '';
    let i = 0;
    while (i < result.length) {
      // Check if we're at a placeholder
      if (result[i] === '\x00' && result.substring(i, i + 3) === PLACEHOLDER_PREFIX) {
        // Find the end of the placeholder
        const endIndex = result.indexOf('\x00', i + 3);
        if (endIndex !== -1) {
          const placeholder = result.substring(i, endIndex + 1);
          escaped += placeholder;
          i = endIndex + 1;
          continue;
        }
      }

      // Escape special characters
      if (ESCAPE_CHARS.includes(result[i])) {
        escaped += escapeChar(result[i]);
      } else {
        escaped += result[i];
      }
      i++;
    }
    result = escaped;

    // Step 8: Restore all placeholders with their formatted content
    for (const [placeholder, content] of placeholders) {
      result = result.replace(placeholder, content);
    }

    // Validate the result
    if (!validateTelegramMarkdown(result)) {
      console.warn("Markdown validation failed, falling back to plain text");
      return { content: stripMarkdown(text), parseMode: undefined };
    }

    return { content: result, parseMode: "MarkdownV2" };
  } catch (error) {
    // If anything fails, return plain text without parse mode
    console.error("Markdown conversion failed, falling back to plain text:", error);
    return { content: stripMarkdown(text), parseMode: undefined };
  }
}

/**
 * Strip markdown formatting and return plain text
 */
function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/, '').replace(/```$/, ''))
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote markers
    .replace(/^>\s*/gm, '');
}

/**
 * Validate that the converted text won't cause Telegram API errors.
 * Returns true if the text looks valid.
 */
export function validateTelegramMarkdown(text: string): boolean {
  try {
    // Check for unmatched code blocks
    const codeBlockCount = (text.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) return false;

    // Check for unmatched inline code (backticks not preceded by backslash)
    let inBacktick = false;
    let inCodeBlock = false;
    for (let i = 0; i < text.length; i++) {
      if (text.substring(i, i + 3) === '```') {
        inCodeBlock = !inCodeBlock;
        i += 2;
        continue;
      }
      if (!inCodeBlock && text[i] === '`' && (i === 0 || text[i - 1] !== '\\')) {
        inBacktick = !inBacktick;
      }
    }
    if (inBacktick) return false;

    // Check for unmatched formatting markers (*, _, ~)
    // This is a simplified check - count unescaped markers
    const checkMarker = (marker: string): boolean => {
      let count = 0;
      let inCode = false;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '`' && (i === 0 || text[i - 1] !== '\\')) {
          inCode = !inCode;
          continue;
        }
        if (!inCode && text[i] === marker && (i === 0 || text[i - 1] !== '\\')) {
          count++;
        }
      }
      return count % 2 === 0;
    };

    if (!checkMarker('*')) return false;
    if (!checkMarker('_')) return false;
    if (!checkMarker('~')) return false;

    return true;
  } catch {
    return false;
  }
}
