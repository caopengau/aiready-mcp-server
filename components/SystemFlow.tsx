'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Bot, Zap, Activity } from 'lucide-react';
import { Handle, Position } from 'reactflow';

const nodeTypes = {
  agent: ({ data }: any) => (
    <div className="relative group">
      <div className="px-5 py-4 shadow-[0_0_30px_rgba(0,255,163,0.1)] rounded-md bg-black border border-cyber-green/50 min-w-[160px] max-w-[220px] relative overflow-hidden transition-all hover:border-cyber-green hover:shadow-[0_0_40px_rgba(0,255,163,0.2)]">
        <div className="absolute top-0 right-0 w-12 h-12 bg-cyber-green/5 rounded-full blur-xl -mr-6 -mt-6"></div>
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-sm bg-cyber-green/10 text-cyber-green shrink-0 mt-0.5">
            <Bot size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold text-cyber-green uppercase tracking-widest mb-1 opacity-70">
              {data.type || 'NEURAL_NODE'}
            </div>
            <div className="text-sm font-bold text-white/90 break-words leading-tight">
              {data.label}
            </div>
          </div>
        </div>
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-cyber-green/50 !border-none !w-1.5 !h-1.5"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-cyber-green/50 !border-none !w-1.5 !h-1.5"
        />
      </div>
    </div>
  ),
  bus: ({ data }: any) => (
    <div className="relative group">
      <div className="px-5 py-4 shadow-[0_0_40px_rgba(188,0,255,0.2)] rounded-md bg-black border border-cyber-purple/50 min-w-[180px] max-w-[240px] text-center relative overflow-hidden transition-all hover:border-cyber-purple">
        <div className="absolute inset-0 bg-cyber-purple/5 animate-pulse"></div>
        <div className="text-[8px] font-bold text-cyber-purple uppercase tracking-[0.3em] mb-2 relative z-10 opacity-70">
          CENTRAL_ORCHESTRATOR
        </div>
        <div className="text-sm font-bold text-white flex items-center justify-center gap-2 relative z-10 mb-1">
          <Zap size={16} className="text-cyber-purple" />
          <span className="break-words">{data.label}</span>
        </div>
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-cyber-purple/50 !border-none"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-cyber-purple/50 !border-none"
        />
      </div>
    </div>
  ),
  event: ({ data }: any) => (
    <div className="relative group">
      <div className="px-4 py-2 shadow-lg rounded-full bg-black border border-cyber-blue/50 min-w-[120px] max-w-[180px] text-center transition-all hover:border-cyber-blue hover:shadow-[0_0_20px_rgba(0,224,255,0.2)]">
        <div className="flex items-center justify-center gap-2">
          <Activity size={12} className="text-cyber-blue opacity-70" />
          <div className="text-[10px] font-bold text-white/90 break-words leading-tight">
            {data.label}
          </div>
        </div>
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-cyber-blue/50 !border-none"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-cyber-blue/50 !border-none"
        />
      </div>
    </div>
  ),
};

interface SystemFlowProps {
  nodes: Node[];
  edges: Edge[];
  height?: string;
}

export default function SystemFlow({
  nodes,
  edges,
  height = '400px',
}: SystemFlowProps) {
  // Improved edges with better label styling
  const defaultEdgeOptions = {
    animated: true,
    style: { stroke: '#00ffa3', strokeWidth: 1.5, opacity: 0.6 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#00ffa3',
    },
    labelStyle: { fill: '#00ffa3', fontWeight: 700, fontSize: '9px' },
    labelBgStyle: { fill: '#050505', fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 2,
  };

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        // Scale coordinates to prevent overlap with larger nodes/labels
        position: {
          x: node.position.x * 1.5,
          y: node.position.y * 1.5,
        },
        type: node.data?.type || 'agent',
      })),
    [nodes]
  );

  return (
    <div
      style={{ height }}
      className="w-full glass-card border-white/5 overflow-hidden my-12 bg-[#050505] relative"
    >
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border border-cyber-green/30 rounded-full text-white">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse"></div>
          <span className="text-[8px] font-bold text-cyber-green uppercase tracking-widest opacity-80">
            Neural_Flow_Active
          </span>
        </div>
      </div>

      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        zoomOnScroll={false}
      >
        <Background
          color="#111"
          gap={20}
          variant={BackgroundVariant.Dots}
          size={1}
        />
        <Controls
          showInteractive={false}
          className="opacity-20 hover:opacity-100 transition-opacity"
        />
      </ReactFlow>
    </div>
  );
}
