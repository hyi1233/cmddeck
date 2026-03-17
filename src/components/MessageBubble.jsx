import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import powershell from 'react-syntax-highlighter/dist/esm/languages/prism/powershell';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import { Copy, Check, User, Bot, Image, FileText, File, Loader } from 'lucide-react';
import ToolCallBlock from './ToolCallBlock';
import { useI18n } from '../i18n';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
const CODE_LANGUAGES = [
  ['bash', bash],
  ['c', c],
  ['cpp', cpp],
  ['css', css],
  ['diff', diff],
  ['go', go],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['jsx', jsx],
  ['markdown', markdown],
  ['markup', markup],
  ['powershell', powershell],
  ['python', python],
  ['rust', rust],
  ['sql', sql],
  ['tsx', tsx],
  ['typescript', typescript],
  ['yaml', yaml],
];
const LANGUAGE_ALIASES = {
  cjs: 'javascript',
  console: 'bash',
  cxx: 'cpp',
  htm: 'markup',
  html: 'markup',
  js: 'javascript',
  jsonc: 'json',
  md: 'markdown',
  ps1: 'powershell',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  'shell-session': 'bash',
  plaintext: '',
  text: '',
  ts: 'typescript',
  txt: '',
  xml: 'markup',
  yml: 'yaml',
  zsh: 'bash',
};
const SUPPORTED_CODE_LANGUAGES = new Set(CODE_LANGUAGES.map(([name]) => name));

for (const [name, language] of CODE_LANGUAGES) {
  SyntaxHighlighter.registerLanguage(name, language);
}

SyntaxHighlighter.alias('bash', ['shell-session']);

function isImagePath(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return IMAGE_EXTS.includes(ext);
}

function normalizeCodeLanguage(language) {
  if (!language) {
    return '';
  }

  const normalized = (LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase()).trim();
  return SUPPORTED_CODE_LANGUAGES.has(normalized) ? normalized : '';
}

// Component that loads a local file as data URL for display
function LocalImage({ filePath, className, alt, onClick }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const result = await window.claude?.readFileAsDataUrl(filePath);
        if (cancelled) return;
        if (result?.success) {
          setDataUrl(result.dataUrl);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-white/5 ${className}`} style={{ minWidth: 80, minHeight: 60 }}>
        <Loader size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }
  if (error || !dataUrl) {
    return (
      <div className={`flex items-center justify-center gap-1 bg-white/5 text-gray-400 text-xs ${className}`} style={{ minWidth: 80, minHeight: 60 }}>
        <Image size={14} />
        <span>{filePath.split(/[/\\]/).pop()}</span>
      </div>
    );
  }
  return <img src={dataUrl} alt={alt} className={className} onClick={onClick} />;
}

function CodeBlock({ inline, className, children, node, ...props }) {
  const [copied, setCopied] = useState(false);
  const { tx } = useI18n();
  const match = /language-([\w#+-]+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const normalizedLang = normalizeCodeLanguage(lang);
  const code = String(children).replace(/\n$/, '');

  // In react-markdown v9, code inside <pre> is a block; otherwise inline
  const isInline = !lang && !className;

  if (isInline) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-2">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#2d2d2d] text-gray-400 text-xs">
          <span>{lang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? tx('Copied', '已复制') : tx('Copy', '复制')}
          </button>
        </div>
      )}
      {!lang && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-all"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
      <SyntaxHighlighter
        style={oneDark}
        language={normalizedLang || undefined}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: lang ? '0 0 8px 8px' : '8px',
          fontSize: 'calc(var(--app-font-size, 14px) - 1px)',
        }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function AttachmentDisplay({ files }) {
  const [expandedImage, setExpandedImage] = useState(null);
  const { tx } = useI18n();

  if (!files || files.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-2">
        {files.map((filePath, i) => {
          const fileName = filePath.split(/[/\\]/).pop();
          if (isImagePath(filePath)) {
            return (
              <div
                key={i}
                className="cursor-pointer rounded-lg overflow-hidden border border-white/20 hover:border-white/40 transition-colors"
                onClick={() => setExpandedImage(filePath)}
              >
                <LocalImage
                  filePath={filePath}
                  alt={fileName}
                  className="max-w-[200px] max-h-[150px] object-cover"
                />
              </div>
            );
          }
          const Icon = ['txt', 'md', 'json', 'js', 'ts', 'py', 'jsx', 'tsx', 'css', 'html'].includes(
            filePath.split('.').pop().toLowerCase()
          )
            ? FileText
            : File;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white/90 text-xs"
            >
              <Icon size={12} />
              <span className="max-w-[160px] truncate">{fileName}</span>
            </div>
          );
        })}
      </div>

      {/* Image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <LocalImage
            filePath={expandedImage}
            alt={tx('Preview', '预览')}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

export default function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user';
  const [copiedMessage, setCopiedMessage] = useState(false);
  const { tx } = useI18n();

  const handleCopyMessage = async () => {
    const content = buildMessageCopyText(message, tx);
    if (!content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      setCopiedMessage(false);
    }
  };

  return (
    <div className={`message-enter group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-claude-orange/15 text-claude-orange'
            : 'bg-claude-orange/10 text-claude-orange'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-claude-orange text-white'
            : 'bg-claude-surface-light dark:bg-claude-surface-dark text-claude-text-light dark:text-claude-text-dark border-l-2 border-claude-orange/60 border-y border-r border-y-claude-border-light dark:border-y-claude-border-dark border-r-claude-border-light dark:border-r-claude-border-dark'
        }`}
      >
        {isUser ? (
          <div>
            {/* Show attachments for user messages */}
            <AttachmentDisplay files={message.attachments} />
            <p className="whitespace-pre-wrap" style={{ fontSize: 'var(--app-font-size, 14px)' }}>{message.content}</p>
          </div>
        ) : (
          <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`} style={{ fontSize: 'var(--app-font-size, 14px)' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => <>{children}</>,
                code: CodeBlock,
              }}
            >
              {message.content || ' '}
            </ReactMarkdown>
            {message.toolUses?.map((tool, i) => (
              <ToolCallBlock key={i} tool={tool} />
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleCopyMessage}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-all ${
              isUser
                ? 'bg-white/15 text-white hover:bg-white/20'
                : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-claude-orange hover:bg-claude-orange/10'
            } ${
              copiedMessage
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
            }`}
            title={tx('Copy message', '复制消息')}
          >
            {copiedMessage ? <Check size={12} /> : <Copy size={12} />}
            {copiedMessage ? tx('Copied', '已复制') : tx('Copy', '复制')}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildMessageCopyText(message, tx) {
  const parts = [];

  if (message.content) {
    parts.push(message.content);
  }

  if (message.attachments?.length > 0) {
    parts.push(`${tx('Attachments', '附件')}:\n${message.attachments.join('\n')}`);
  }

  return parts.join('\n\n').trim();
}
