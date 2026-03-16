'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, CreditCard, Activity } from 'lucide-react';

interface ManagedAccountStatusProps {
  awsSpendCents: number;
  awsInclusionCents: number;
  aiTokenBalanceCents: number;
  aiRefillThresholdCents: number;
  mutationCount: number;
}

export const ManagedAccountStatus: React.FC<ManagedAccountStatusProps> = ({
  awsSpendCents,
  awsInclusionCents,
  aiTokenBalanceCents,
  aiRefillThresholdCents,
  mutationCount,
}) => {
  const awsProgress = Math.min((awsSpendCents / awsInclusionCents) * 100, 100);
  const aiProgress = Math.min((aiTokenBalanceCents / 1000) * 100, 100); // Assuming $10 (1000 cents) max gauge

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* AWS Compute Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl overflow-hidden relative"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-zinc-400 text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              AWS Compute Usage
            </h3>
            <p className="text-2xl font-bold text-white mt-1">
              ${(awsSpendCents / 100).toFixed(2)}
              <span className="text-sm text-zinc-500 font-normal ml-2">
                / ${(awsInclusionCents / 100).toFixed(2)} included
              </span>
            </p>
          </div>
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awsProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full ${awsProgress > 90 ? 'bg-red-500' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            <span>Utilization</span>
            <span>{awsProgress.toFixed(1)}%</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Serverless Hard-Stop Active: $22.50
        </div>
      </motion.div>

      {/* AI Fuel Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-zinc-400 text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              AI Fuel Tank
            </h3>
            <p className="text-2xl font-bold text-white mt-1">
              ${(aiTokenBalanceCents / 100).toFixed(2)}
              <span className="text-sm text-zinc-500 font-normal ml-2">
                remaining
              </span>
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-amber-500/10 p-2 rounded-lg cursor-pointer group"
          >
            <CreditCard className="w-5 h-5 text-amber-500 group-hover:text-white transition-colors" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden p-1 border border-zinc-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aiProgress}%` }}
              transition={{ duration: 1.5, ease: 'circOut' }}
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            <span>Mutation Count</span>
            <span>{mutationCount} Events</span>
          </div>
        </div>

        <button className="mt-6 w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white text-sm font-medium rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-2">
          Refill Fuel Pack ($10.00)
        </button>
      </motion.div>
    </div>
  );
};
