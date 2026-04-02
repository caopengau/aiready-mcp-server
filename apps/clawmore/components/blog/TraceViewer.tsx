'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Zap, Activity, Hash } from 'lucide-react';

interface TraceLog {
  id: string;
  time: string;
  type: 'PLAN' | 'EXEC' | 'VAL' | 'SUCCESS';
  message: string;
  detail?: string;
  status?: 'IDLE' | 'WORKING' | 'DONE';
}

const TRACE_SEQUENCE: TraceLog[] = [
  {
    id: '1',
    time: '0.00s',
    type: 'PLAN',
    message: 'Analyzing repository topology...',
    status: 'DONE',
  },
  {
    id: '2',
    time: '0.42s',
    type: 'PLAN',
    message: 'Identified missing GAP in receipts processing.',
    status: 'DONE',
  },
  {
    id: '3',
    time: '1.12s',
    type: 'PLAN',
    message: 'Designing Mutation strategy: [LambdaV3 + SNS_TOPIC]',
    status: 'DONE',
  },
  {
    id: '4',
    time: '2.55s',
    type: 'EXEC',
    message: 'Provisioning isolated AWS account...',
    status: 'WORKING',
  },
  {
    id: '5',
    time: '5.10s',
    type: 'EXEC',
    message: 'Writing TypeScript handler for ReceiptProcessor...',
    status: 'IDLE',
  },
  {
    id: '6',
    time: '8.22s',
    type: 'VAL',
    message: 'Running integration tests locally...',
    status: 'IDLE',
  },
  {
    id: '7',
    time: '12.4s',
    type: 'SUCCESS',
    message: 'Mutation complete. PR #405 submitted.',
    status: 'IDLE',
  },
];

export default function TraceViewer() {
  const [logs, setLogs] = useState<TraceLog[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex < TRACE_SEQUENCE.length) {
      const timer = setTimeout(
        () => {
          setLogs((prev) => [...prev, TRACE_SEQUENCE[activeIndex]]);
          setActiveIndex((prev) => prev + 1);
        },
        activeIndex === 0 ? 500 : 2000
      );
      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  const reset = () => {
    setLogs([]);
    setActiveIndex(0);
  };

  return (
    <div className="my-16 rounded-3xl bg-[#050505] border border-white/5 overflow-hidden shadow-2xl relative group">
      {/* Header bar */}
      <div className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal size={14} className="text-cyber-green" />
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            ClawMore_Agent_Trace_Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-[8px] font-mono text-cyber-green opacity-70">
            ACTIVE_STREAM
          </span>
          <button
            onClick={reset}
            className="ml-4 p-1-5 rounded-md hover:bg-white/5 transition-colors text-[9px] font-mono text-zinc-500 uppercase border border-white/10"
          >
            RE_RUN_TRACE
          </button>
        </div>
      </div>

      {/* Main Terminal View */}
      <div className="p-6 font-mono text-[11px] min-h-75 max-h-100 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 group/line"
            >
              <div className="flex items-start gap-4">
                <span className="text-zinc-600 w-12 shrink-0">{log.time}</span>
                <span
                  className={`w-16 shrink-0 font-bold ${
                    log.type === 'PLAN'
                      ? 'text-cyber-blue'
                      : log.type === 'EXEC'
                        ? 'text-cyber-purple'
                        : log.type === 'VAL'
                          ? 'text-yellow-500'
                          : 'text-cyber-green'
                  }`}
                >
                  [{log.type}]
                </span>
                <div className="flex-1">
                  <div className="text-zinc-300 group-hover/line:text-white transition-colors flex items-center gap-2">
                    {log.message}
                    {i === logs.length - 1 &&
                      activeIndex < TRACE_SEQUENCE.length && (
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="w-1 h-3 bg-cyber-green"
                        />
                      )}
                  </div>
                  {log.detail && (
                    <div className="mt-1 text-zinc-500 italic text-[10px] pl-4 border-l border-zinc-800">
                      {log.detail}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Status Bar */}
      <div className="p-4 bg-zinc-900/40 border-t border-white/5 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Hash size={12} className="text-zinc-600" />
          <span className="text-[9px] uppercase tracking-tighter text-zinc-400">
            CID: 21460898-18b0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-zinc-600" />
          <span className="text-[9px] uppercase tracking-tighter text-zinc-400">
            LATENCY: 42MS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-cyber-purple" />
          <span className="text-[9px] uppercase tracking-tighter text-zinc-400 font-mono">
            SUMMER_ENGINE_V4
          </span>
        </div>
      </div>
    </div>
  );
}
