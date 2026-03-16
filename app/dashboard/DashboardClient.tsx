'use client';

import React from 'react';
import { ManagedAccountStatus } from '../../components/ManagedAccountStatus';
import Navbar from '../../components/Navbar';
import { Activity, LayoutDashboard, Settings, User, Zap } from 'lucide-react';

interface DashboardClientProps {
  user: any;
  status: {
    awsSpendCents: number;
    awsInclusionCents: number;
    aiTokenBalanceCents: number;
    aiRefillThresholdCents: number;
    mutationCount: number;
  };
}

export default function DashboardClient({
  user,
  status,
}: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-cyber-blue/30 selection:text-cyber-blue font-sans">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">
              Managed <span className="text-cyber-blue">Platform</span>
            </h1>
            <p className="text-zinc-500 mt-1 font-mono text-xs uppercase tracking-widest">
              Live Infrastructure Evolution Status
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyber-blue to-purple-600 flex items-center justify-center font-bold">
              {user.name?.[0] || user.email?.[0] || 'U'}
            </div>
            <div>
              <p className="text-sm font-bold">{user.name || 'Developer'}</p>
              <p className="text-[10px] text-zinc-500 font-mono">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20 rounded-xl text-sm font-bold transition-all">
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium transition-all group">
                <Activity className="w-4 h-4 group-hover:text-cyber-blue transition-colors" />
                Nodes
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium transition-all group">
                <User className="w-4 h-4 group-hover:text-cyber-blue transition-colors" />
                Account
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium transition-all group">
                <Settings className="w-4 h-4 group-hover:text-cyber-blue transition-colors" />
                Settings
              </button>
            </nav>
          </div>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-3 space-y-8">
            <ManagedAccountStatus
              awsSpendCents={status.awsSpendCents}
              awsInclusionCents={status.awsInclusionCents}
              aiTokenBalanceCents={status.aiTokenBalanceCents}
              aiRefillThresholdCents={status.aiRefillThresholdCents}
              mutationCount={status.mutationCount}
            />

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyber-blue" />
                Recent Activity
              </h2>

              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyber-blue/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-white">
                        Infrastructure Mutation v0.4.{i + 8}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono italic">
                        Successful Commit • 2h ago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-500">
                        +1 SCR
                      </p>
                      <p className="text-[10px] text-zinc-600 font-mono tracking-tighter">
                        ID: claw_{Math.random().toString(36).substring(7)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
