const fs = require('fs');
const path = require('path');
const os = require('os');

const CODEX_DIR = path.join(os.homedir(), '.codex');
const HISTORY_FILE = path.join(CODEX_DIR, 'history.jsonl');
const SESSIONS_DIR = path.join(CODEX_DIR, 'sessions');
let sessionFileIndexCache = null;

function loadHistoryIndex() {
  try {
    const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean);
    const sessionMap = new Map();
    const sessionFileIndex = getSessionFileIndex({ forceRefresh: true });

    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const sessionId = entry.session_id;
      if (!sessionId) {
        continue;
      }

      const timestamp = Number(entry.ts) * 1000;
      const text = decodeText(entry.text || '').trim();
      const title = text ? text.slice(0, 60) : 'Untitled';

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          provider: 'codex',
          sessionId,
          project: '',
          title,
          firstTimestamp: timestamp,
          lastTimestamp: timestamp,
          promptCount: 1,
          prompts: text ? [text] : [],
        });
      } else {
        const existing = sessionMap.get(sessionId);
        existing.lastTimestamp = Math.max(existing.lastTimestamp, timestamp);
        existing.firstTimestamp = Math.min(existing.firstTimestamp, timestamp);
        existing.promptCount += 1;
        if (text && existing.prompts.length < 5) {
          existing.prompts.push(text);
        }
      }
    }

    for (const session of sessionMap.values()) {
      const fileEntry = sessionFileIndex.get(session.sessionId);
      if (fileEntry?.meta?.cwd) {
        session.project = fileEntry.meta.cwd;
      }
    }

    return Array.from(sessionMap.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  } catch (err) {
    console.error('Failed to load Codex history index:', err.message);
    return [];
  }
}

function loadSessionMessages(sessionId) {
  const filePath = findSessionFile(sessionId);
  if (!filePath) {
    return { messages: [], error: 'Session file not found' };
  }

  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const messages = [];
    const pendingToolCalls = [];
    const toolCallsById = new Map();

    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (entry.type !== 'response_item' || !entry.payload) {
        continue;
      }

      if (entry.payload.type === 'function_call') {
        const toolCall = createFunctionToolCall(entry.payload);
        if (toolCall) {
          pendingToolCalls.push(toolCall);
          if (toolCall.id) {
            toolCallsById.set(toolCall.id, toolCall);
          }
        }
        continue;
      }

      if (entry.payload.type === 'function_call_output') {
        mergeFunctionToolOutput(toolCallsById, pendingToolCalls, entry.payload);
        continue;
      }

      if (entry.payload.type === 'custom_tool_call') {
        const toolCall = createCustomToolCall(entry.payload);
        if (toolCall) {
          pendingToolCalls.push(toolCall);
        }
        continue;
      }

      if (entry.payload.type !== 'message') {
        continue;
      }

      const role = entry.payload.role;
      if (role !== 'user' && role !== 'assistant') {
        continue;
      }

      const timestamp = Date.parse(entry.timestamp);
      const content = extractMessageText(entry.payload.content || []);
      if (role === 'user' && pendingToolCalls.length > 0) {
        flushPendingToolCalls(messages, pendingToolCalls, toolCallsById, timestamp);
      }

      const toolUses = role === 'assistant'
        ? consumePendingToolCalls(pendingToolCalls, toolCallsById)
        : undefined;

      if (!content.trim() && (!toolUses || toolUses.length === 0)) {
        continue;
      }

      messages.push({
        role,
        content,
        toolUses,
        timestamp,
      });
    }

    if (pendingToolCalls.length > 0) {
      flushPendingToolCalls(messages, pendingToolCalls, toolCallsById, Date.now());
    }

    return { messages };
  } catch (err) {
    return { messages: [], error: err.message };
  }
}

function findSessionFile(sessionId) {
  const cachedPath = getSessionFileIndex().get(sessionId)?.filePath;
  if (cachedPath) {
    return cachedPath;
  }

  return getSessionFileIndex({ forceRefresh: true }).get(sessionId)?.filePath || null;
}

function loadSessionMeta(sessionId) {
  const filePath = findSessionFile(sessionId);
  if (!filePath) {
    return null;
  }

  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (entry.type === 'session_meta' && entry.payload) {
        return entry.payload;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractMessageText(contentBlocks) {
  let text = '';

  for (const block of contentBlocks) {
    if ((block.type === 'input_text' || block.type === 'output_text') && block.text) {
      text += decodeText(block.text);
    }
  }

  return text.trim();
}

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

function looksLikeMojibake(text) {
  return /[ÃÐÑØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö]/.test(text);
}

function scoreReadableText(text) {
  const readable = text.match(/[\u4e00-\u9fff\w\s，。！？；：“”‘’（）《》、,.!?:;"'()[\]{}<>/-]/g);
  return readable ? readable.length : 0;
}

function getReadableScore(text) {
  const readable = text.match(/[\u4e00-\u9fff\w\s,.!?:;"'()[\]{}<>/-]/g);
  return readable ? readable.length : 0;
}

function createFunctionToolCall(payload) {
  const name = normalizeToolName(payload.name);
  if (!name) {
    return null;
  }

  return {
    id: payload.call_id || null,
    name,
    input: parseFunctionArguments(payload.arguments),
    status: 'running',
    result: null,
  };
}

function mergeFunctionToolOutput(toolCallsById, pendingToolCalls, payload) {
  const output = typeof payload.output === 'string'
    ? decodeText(payload.output)
    : payload.output;
  const existing = payload.call_id ? toolCallsById.get(payload.call_id) : null;

  if (existing) {
    existing.result = output || null;
    existing.status = inferToolStatusFromOutput(output);
    return;
  }

  pendingToolCalls.push({
    id: payload.call_id || null,
    name: 'Tool',
    input: null,
    status: inferToolStatusFromOutput(output),
    result: output || null,
  });
}

function createCustomToolCall(payload) {
  const name = normalizeToolName(payload.name);
  if (!name) {
    return null;
  }

  return {
    id: payload.call_id || null,
    name,
    input: decodeStructuredValue(payload.input),
    status: payload.status === 'failed' ? 'error' : 'completed',
    result: payload.output ? decodeStructuredValue(payload.output) : null,
  };
}

function flushPendingToolCalls(messages, pendingToolCalls, toolCallsById, timestamp) {
  const toolUses = consumePendingToolCalls(pendingToolCalls, toolCallsById);
  if (!toolUses || toolUses.length === 0) {
    return;
  }

  messages.push({
    role: 'assistant',
    content: '',
    toolUses,
    timestamp,
  });
}

function consumePendingToolCalls(pendingToolCalls, toolCallsById) {
  if (pendingToolCalls.length === 0) {
    return undefined;
  }

  const toolUses = pendingToolCalls.map((toolCall) => ({
    id: toolCall.id || null,
    name: toolCall.name,
    input: toolCall.input,
    result: toolCall.result,
    status: toolCall.status || 'completed',
  }));

  pendingToolCalls.length = 0;
  toolCallsById.clear();
  return toolUses;
}

function parseFunctionArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== 'string') {
    return null;
  }

  try {
    return decodeStructuredValue(JSON.parse(rawArguments));
  } catch {
    return decodeText(rawArguments);
  }
}

function decodeStructuredValue(value) {
  if (typeof value === 'string') {
    return decodeText(value);
  }

  if (Array.isArray(value)) {
    return value.map(decodeStructuredValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, decodeStructuredValue(entryValue)])
    );
  }

  return value;
}

function inferToolStatusFromOutput(output) {
  if (typeof output === 'string') {
    const exitCodeMatch = output.match(/Exit code:\s*(\d+)/i);
    if (exitCodeMatch) {
      return exitCodeMatch[1] === '0' ? 'completed' : 'error';
    }
  }

  return 'completed';
}

function normalizeToolName(name) {
  if (!name || typeof name !== 'string') {
    return null;
  }

  const toolNameMap = {
    shell_command: 'Bash',
    apply_patch: 'Edit',
    view_image: 'Read',
    update_plan: 'Task Plan',
    request_user_input: 'Prompt User',
    'multi_tool_use.parallel': 'Multi Tool',
  };

  if (toolNameMap[name]) {
    return toolNameMap[name];
  }

  return name
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

module.exports = {
  loadHistoryIndex,
  loadSessionMessages,
  findSessionFile,
};

function getSessionFileIndex({ forceRefresh = false } = {}) {
  if (!forceRefresh && sessionFileIndexCache) {
    return sessionFileIndexCache;
  }

  sessionFileIndexCache = buildSessionFileIndex();
  return sessionFileIndexCache;
}

function buildSessionFileIndex() {
  const index = new Map();

  if (!fs.existsSync(SESSIONS_DIR)) {
    return index;
  }

  const stack = [SESSIONS_DIR];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.jsonl')) {
        continue;
      }

      const sessionId = extractSessionIdFromFilename(entry.name);
      if (!sessionId || index.has(sessionId)) {
        continue;
      }

      index.set(sessionId, {
        filePath: fullPath,
        meta: readSessionMeta(fullPath),
      });
    }
  }

  return index;
}

function extractSessionIdFromFilename(fileName) {
  const match = fileName.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
  return match ? match[1] : null;
}

function readSessionMeta(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (entry.type === 'session_meta' && entry.payload) {
        return entry.payload;
      }
    }
  } catch {
    return null;
  }

  return null;
}
