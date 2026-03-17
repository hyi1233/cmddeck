import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ToolCallBlock from './ToolCallBlock';
import { Sparkles, Brain, Loader } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ChatView({
  messages,
  streamingText,
  streamingToolCalls,
  isStreaming,
  isLoadingHistory = false,
  thinkingText,
  progressInfo,
  onSend,
  currentProvider = 'claude',
}) {
  const bottomRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const { tx } = useI18n();

  // Scroll to bottom: instant on session switch, smooth on new messages
  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    const curCount = messages.length;
    // Session switched (message count jumped or reset) → instant scroll
    const isSessionSwitch = curCount > 0 && (curCount < prevCount || Math.abs(curCount - prevCount) > 1);
    prevMsgCountRef.current = curCount;

    bottomRef.current?.scrollIntoView({
      behavior: isSessionSwitch ? 'instant' : 'smooth',
    });
  }, [messages, streamingText, streamingToolCalls, thinkingText]);

  if (isLoadingHistory && messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-claude-border-light dark:border-claude-border-dark bg-claude-surface-light dark:bg-claude-surface-dark px-4 py-3 text-sm text-gray-400">
          <Loader size={16} className="animate-spin text-claude-orange" />
          <span>{tx('Loading conversation...', '正在加载会话...')}</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    const providerLabel = currentProvider === 'codex' ? 'Codex' : 'Claude Code';
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          {/* Icon with gradient ring glow */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-claude-orange/30 via-claude-orange-light/20 to-transparent blur-lg" />
            <div className="relative w-full h-full rounded-2xl bg-claude-orange/10 border border-claude-orange/20 flex items-center justify-center">
              <Sparkles size={36} className="text-claude-orange" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-claude-text-light dark:text-claude-text-dark">
            {tx('{provider} Desktop', '{provider} 桌面版', { provider: providerLabel })}
          </h2>
          <p className="text-sm text-claude-muted-light dark:text-claude-muted-dark leading-relaxed">
            {tx(
              'A desktop interface for {provider}. Ask questions, write code, debug issues, and more. Full interactive experience with tool approval and real-time progress.',
              '{provider} 的桌面界面。你可以提问、写代码、排查问题等，并获得完整的工具审批和实时进度体验。',
              { provider: providerLabel }
            )}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {[
              tx('Help me debug this code', '帮我调试这段代码'),
              tx('Write a Python script', '写一个 Python 脚本'),
              tx('Explain this error', '解释这个错误'),
              tx('Refactor my function', '重构这个函数'),
            ].map((hint) => (
              <button
                key={hint}
                onClick={() => onSend?.(hint, [])}
                className="px-3 py-1.5 rounded-full text-xs bg-claude-surface-light dark:bg-claude-surface-dark border border-claude-border-light dark:border-claude-border-dark text-claude-muted-light dark:text-claude-muted-dark hover:border-claude-orange/40 hover:text-claude-orange transition-colors cursor-pointer"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Rendered messages */}
      {messages.map((msg, i) => (
        <div key={i}>
          {(msg.role !== 'assistant' || Boolean(String(msg.content || '').trim()) || (msg.attachments?.length || 0) > 0) && (
            <MessageBubble message={msg} isStreaming={false} />
          )}
          {/* Show tool calls that belong to this message */}
          {msg.role === 'assistant' && msg.toolCalls?.length > 0 && (
            <div className="ml-11 mt-1 space-y-1">
              {msg.toolCalls.map((tc, j) => (
                <ToolCallBlock key={tc.id || j} tool={tc} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Streaming: thinking indicator */}
      {isStreaming && thinkingText && (
        <div className="flex gap-3 message-enter">
          <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
            <Brain size={16} className="text-purple-400 animate-pulse" />
          </div>
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-purple-500/5 border border-purple-400/20 text-purple-300">
            <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-1 font-medium">
              {tx('Thinking...', '思考中...')}
            </div>
            <p className="text-xs opacity-70 line-clamp-3 font-mono">
              {thinkingText.slice(-200)}
            </p>
          </div>
        </div>
      )}

      {/* Streaming: tool calls in progress */}
      {isStreaming && streamingToolCalls.length > 0 && (
        <div className="ml-11 space-y-1">
          {streamingToolCalls.map((tc, i) => (
            <ToolCallBlock key={tc.id || i} tool={tc} />
          ))}
        </div>
      )}

      {/* Streaming: progress info */}
      {isStreaming && progressInfo && (
        <div className="ml-11 flex items-center gap-2 text-xs text-gray-400 py-1">
          <Loader size={10} className="animate-spin" />
          <span>{progressInfo.message || tx('Working...', '处理中...')}</span>
        </div>
      )}

      {/* Streaming: assistant text */}
      {isStreaming && streamingText && (
        <MessageBubble
          message={{
            role: 'assistant',
            content: streamingText,
          }}
          isStreaming={true}
        />
      )}

      {/* Streaming: smooth pulse loading dots */}
      {isStreaming && !streamingText && !thinkingText && streamingToolCalls.length === 0 && (
        <div className="flex gap-3 message-enter">
          <div className="w-8 h-8 rounded-full bg-claude-orange/15 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-claude-orange animate-pulse" />
          </div>
          <div className="rounded-2xl px-4 py-3 bg-claude-surface-light dark:bg-claude-surface-dark border border-claude-border-light dark:border-claude-border-dark">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-claude-orange pulse-dot" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-claude-orange pulse-dot" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 rounded-full bg-claude-orange pulse-dot" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
