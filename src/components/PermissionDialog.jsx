import React from 'react';
import {
  ShieldAlert,
  Check,
  X,
  Terminal,
  FileEdit,
  Eye,
  Search,
  Globe,
} from 'lucide-react';
import { useI18n } from '../i18n';

const TOOL_ICONS = {
  Bash: Terminal,
  Edit: FileEdit,
  Write: FileEdit,
  Read: Eye,
  Grep: Search,
  Glob: Search,
  WebFetch: Globe,
  WebSearch: Globe,
};

export default function PermissionDialog({ request, onRespond }) {
  const { tx } = useI18n();
  if (!request) return null;

  const Icon = TOOL_ICONS[request.tool] || Terminal;

  const getDescription = () => {
    if (!request.input) return `${request.tool}`;
    switch (request.tool) {
      case 'Bash':
        return request.input.command || tx('Execute command', '执行命令');
      case 'Edit':
      case 'Write':
        return `${tx('Modify', '修改')}: ${request.input.file_path || tx('file', '文件')}`;
      case 'Read':
        return `${tx('Read', '读取')}: ${request.input.file_path || tx('file', '文件')}`;
      default:
        return JSON.stringify(request.input).slice(0, 200);
    }
  };

  return (
    <div className="mx-4 mb-3 message-enter">
      <div className="rounded-xl border-2 border-yellow-400/40 bg-yellow-400/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400/10 border-b border-yellow-400/20">
          <ShieldAlert size={16} className="text-yellow-400" />
          <span className="text-sm font-medium text-yellow-300">
            {tx('Permission Required', '需要权限')}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 mb-3">
            <Icon size={14} className="text-claude-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-claude-text-light dark:text-claude-text-dark">
                {request.tool}
              </div>
              <pre className="text-xs font-mono text-gray-400 mt-1 whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
                {getDescription()}
              </pre>
            </div>
          </div>

          {/* Action buttons — increased spacing for easier clicking */}
          <div className="flex gap-3">
            <button
              onClick={() => onRespond(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
            >
              <Check size={14} />
              {tx('Allow', '允许')}
            </button>
            <button
              onClick={() => onRespond(false)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
            >
              <X size={14} />
              {tx('Deny', '拒绝')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
