import { motion } from 'framer-motion';

interface Tool {
  id: string;
  icon: string;
  name: string;
  package: string;
  description: string;
  color: string;
  features: string[];
  quickStart: string;
  output: string;
}

interface DocsToolDetailsProps {
  tool: Tool;
}

export default function DocsToolDetails({ tool }: DocsToolDetailsProps) {
  return (
    <motion.div
      key={tool.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg"
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`w-16 h-16 bg-gradient-to-r ${tool.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}
        >
          {tool.icon}
        </div>
        <div>
          <h3 className="text-3xl font-black text-slate-900">{tool.name}</h3>
          <code className="text-sm text-slate-500 font-mono">
            {tool.package}
          </code>
        </div>
      </div>

      <p className="text-lg text-slate-600 mb-6">{tool.description}</p>

      <h4 className="text-xl font-bold text-slate-900 mb-3">✨ Features</h4>
      <ul className="space-y-2 mb-6">
        {tool.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-slate-700">
            <span className="text-green-600 mt-1">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <h4 className="text-xl font-bold text-slate-900 mb-3">🚀 Quick Start</h4>
      <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-6 overflow-x-auto">
        <pre className="whitespace-pre-wrap">{tool.quickStart}</pre>
      </div>

      <h4 className="text-xl font-bold text-slate-900 mb-3">
        📊 Example Output
      </h4>
      <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
        <pre className="whitespace-pre-wrap">{tool.output}</pre>
      </div>
    </motion.div>
  );
}
