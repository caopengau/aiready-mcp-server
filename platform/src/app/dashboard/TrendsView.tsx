'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { scoreColor } from '@aiready/components';
import type { Analysis } from '@/lib/db';

interface TrendsViewProps {
  repoId: string;
  repoName: string;
  onClose: () => void;
}

export function TrendsView({ repoId, repoName, onClose }: TrendsViewProps) {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/repos/${repoId}/history?limit=20`);
        const data = await res.json();
        if (res.ok) {
          // Reverse for timeline (oldest to newest)
          setHistory(data.analyses.reverse());
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [repoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const scores = history.map((h) => h.aiScore || 0);
  const maxScore = 100;
  const height = 200;
  const width = 600;
  const padding = 40;

  const points = scores.map((score, i) => {
    const x = padding + (i * (width - 2 * padding)) / (scores.length - 1 || 1);
    const y = height - padding - (score * (height - 2 * padding)) / maxScore;
    return { x, y, score, timestamp: history[i].timestamp };
  });

  const pathD =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ')
      : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-8 max-w-4xl mx-auto border border-white/10 shadow-2xl overflow-hidden"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Analysis Trends</h2>
          <p className="text-slate-400 text-sm">{repoName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
        >
          Close
        </button>
      </div>

      {history.length < 2 ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-700/30">
          <p className="text-slate-400">Not enough data to show trends yet.</p>
          <p className="text-xs text-slate-500 mt-2">
            Run more analyses to see your progress.
          </p>
        </div>
      ) : (
        <div className="relative h-[250px] w-full group">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map((level) => (
              <g key={level}>
                <line
                  x1={padding}
                  y1={height - padding - (level * (height - 2 * padding)) / 100}
                  x2={width - padding}
                  y2={height - padding - (level * (height - 2 * padding)) / 100}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={height - padding - (level * (height - 2 * padding)) / 100}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-[10px] fill-slate-500 font-mono"
                >
                  {level}
                </text>
              </g>
            ))}

            {/* Gradient Fill */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.2)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
              </linearGradient>
            </defs>
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
              fill="url(#chartGradient)"
            />

            {/* Main Path */}
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              d={pathD}
              fill="none"
              stroke="rgba(6, 182, 212, 0.8)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {points.map((p, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  className={`fill-slate-900 stroke-2 ${scoreColor(p.score).replace('text', 'stroke')}`}
                />

                {/* Tooltip Hover Area */}
                <rect
                  x={p.x - 10}
                  y={padding}
                  width="20"
                  height={height - 2 * padding}
                  fill="transparent"
                  className="cursor-pointer peer"
                />

                {/* Tooltip Label */}
                <g className="opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none">
                  <rect
                    x={p.x - 20}
                    y={p.y - 30}
                    width="40"
                    height="20"
                    rx="4"
                    className="fill-slate-800 border border-white/10"
                  />
                  <text
                    x={p.x}
                    y={p.y - 16}
                    textAnchor="middle"
                    className="text-[10px] fill-white font-bold"
                  >
                    {p.score}
                  </text>
                </g>
              </motion.g>
            ))}
          </svg>

          <div className="flex justify-between mt-4 px-[40px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Earlier
            </span>
            <span className="text-[10px] text-cyan-500 uppercase tracking-wider font-bold">
              Latest
            </span>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          📈
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Progress Insights</h4>
          <p className="text-xs text-slate-400">
            {scores.length >= 2
              ? scores[scores.length - 1] > scores[0]
                ? `Your AI-Readiness score improved by ${scores[scores.length - 1] - scores[0]} points since tracking began.`
                : scores[scores.length - 1] < scores[0]
                  ? `Your score decreased by ${scores[0] - scores[scores.length - 1]} points. Focus on reducing deep import chains.`
                  : 'Your score is stable. Look for quick wins to boost it further.'
              : 'Keep running scans to build your historical record.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
