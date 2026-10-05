import React, { useEffect, useRef, useState } from 'react';
import { IDeploymentLog } from '../../types';
import { Terminal, Copy, Check, ArrowDownCircle, RefreshCw } from 'lucide-react';

interface TerminalLogsProps {
  logs: IDeploymentLog[];
  status?: string;
  onRefresh?: () => void;
  isPolling?: boolean;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  status,
  onRefresh,
  isPolling = false,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.stage}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-success font-medium';
      case 'error':
        return 'text-error font-semibold';
      case 'warn':
        return 'text-warning';
      default:
        return 'text-deployText-secondary';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'SECURITY':
        return 'bg-purple-900/60 text-purple-300 border-purple-800';
      case 'BUILD':
        return 'bg-blue-900/60 text-blue-300 border-blue-800';
      case 'PHP_RUNTIME':
        return 'bg-indigo-900/60 text-indigo-300 border-indigo-800';
      case 'LIVE':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-800';
      case 'ERROR':
        return 'bg-red-900/60 text-red-300 border-red-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="terminal-window rounded-xl shadow-2xl overflow-hidden flex flex-col h-[460px]">
      {/* Header bar */}
      <div className="bg-[#111827] px-4 py-2.5 border-b border-deployBorder flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center space-x-2 pl-3 text-xs text-deployText-secondary font-mono">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <span>deployment-stream.log</span>
            {isPolling && (
              <span className="flex items-center text-[10px] text-accent animate-pulse">
                • LIVE STREAMING
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh logs"
              className="p-1.5 text-deployText-secondary hover:text-white hover:bg-card rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              autoScroll ? 'text-accent bg-accent/10' : 'text-deployText-secondary hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-mono text-deployText-secondary hover:text-white bg-card hover:bg-deployBorder rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed bg-[#0B1120]">
        {logs.length === 0 ? (
          <div className="text-deployText-muted italic">Waiting for deployment worker output...</div>
        ) : (
          logs.map((log, index) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div key={index} className="flex items-start space-x-2 hover:bg-white/[0.02] py-0.5 px-1 rounded">
                <span className="text-deployText-muted shrink-0 select-none">[{timeStr}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] border uppercase shrink-0 select-none ${getStageColor(
                    log.stage
                  )}`}
                >
                  {log.stage}
                </span>
                <span className={`break-all ${getLevelStyle(log.level)}`}>{log.message}</span>
              </div>
            );
          })
        )}

        {status === 'BUILDING' && (
          <div className="flex items-center space-x-2 text-accent py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping" />
            <span className="italic">Running deployment tasks...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
