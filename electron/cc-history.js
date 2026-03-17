const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

/**
 * Read the history.jsonl index and group entries by sessionId.
 * Returns an array of session summaries sorted by most recent first.
 */
function loadHistoryIndex() {
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    // Group by sessionId, keep first display as title and track timestamps
    const sessionMap = new Map();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const { sessionId, project, timestamp, display } = entry;
        const decodedDisplay = decodeText(display || '').trim();
        if (!sessionId) continue;

        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId,
            project: project || '',
            title: decodedDisplay || 'Untitled',
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
            promptCount: 1,
            prompts: decodedDisplay ? [decodedDisplay] : [],
          });
        } else {
          const existing = sessionMap.get(sessionId);
          existing.lastTimestamp = Math.max(
            existing.lastTimestamp,
            timestamp
          );
          existing.firstTimestamp = Math.min(
            existing.firstTimestamp,
            timestamp
          );
          existing.promptCount++;
          if (decodedDisplay && existing.prompts.length < 5) {
            existing.prompts.push(decodedDisplay);
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    // Convert to array, sort by most recent
    return Array.from(sessionMap.values())
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  } catch (e) {
    console.error('Failed to load CC history index:', e.message);
    return [];
  }
}

/**
 * Find the JSONL file for a given session.
 * Searches all project directories for the matching sessionId.
 */
function findSessionFile(sessionId) {
  try {
    const projectDirs = fs.readdirSync(PROJECTS_DIR);
    for (const dir of projectDirs) {
      const filePath = path.join(PROJECTS_DIR, dir, `${sessionId}.jsonl`);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Load full conversation messages from a session JSONL file.
 * Extracts user and assistant messages in order.
 */
function loadSessionMessages(sessionId) {
  const filePath = findSessionFile(sessionId);
  if (!filePath) {
    return { messages: [], error: 'Session file not found' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    const messages = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'user' && entry.message) {
          const msg = entry.message;
          let text = '';

          if (typeof msg.content === 'string') {
            text = decodeText(msg.content);
          } else if (Array.isArray(msg.content)) {
            // Extract text from content blocks, skip tool_result blocks
            for (const block of msg.content) {
              if (block.type === 'text') {
                text += decodeText(block.text || '');
              } else if (block.type === 'tool_result') {
                // Skip tool results in display
              }
            }
          }

          if (text.trim()) {
            messages.push({
              role: 'user',
              content: text.trim(),
              timestamp: entry.timestamp,
            });
          }
        } else if (entry.type === 'assistant' && entry.message) {
          const msg = entry.message;
          let text = '';
          const toolUses = [];

          if (msg.content && Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if (block.type === 'text') {
                text += decodeText(block.text || '');
              } else if (block.type === 'tool_use') {
                toolUses.push({
                  name: block.name,
                  input: block.input,
                });
              }
            }
          }

          if (text.trim() || toolUses.length > 0) {
            messages.push({
              role: 'assistant',
              content: text.trim(),
              toolUses: toolUses.length > 0 ? toolUses : undefined,
              timestamp: entry.timestamp,
            });
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    return { messages };
  } catch (e) {
    return { messages: [], error: e.message };
  }
}

module.exports = {
  loadHistoryIndex,
  loadSessionMessages,
  findSessionFile,
};

function decodeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    if (!repaired || repaired === text) {
      return text;
    }
    return getReadableScore(repaired) > getReadableScore(text) ? repaired : text;
  } catch {
    return text;
  }
}

function getReadableScore(text) {
  const readable = text.match(/[\u4e00-\u9fff\w\s,.!?:;"'()[\]{}<>/-]/g);
  return readable ? readable.length : 0;
}

function looksLikeMojibake(text) {
  return /[脙脨脩脴脵脷脹脺脻脼脽脿谩芒茫盲氓忙莽猫茅锚毛矛铆卯茂冒帽貌贸么玫枚]/.test(text);
}

function scoreReadableText(text) {
  const readable = text.match(/[\u4e00-\u9fff\w\s锛屻€傦紒锛燂紱锛氣€溾€濃€樷€欙紙锛夈€娿€嬨€?.!?:;"'()[\]{}<>/-]/g);
  return readable ? readable.length : 0;
}
