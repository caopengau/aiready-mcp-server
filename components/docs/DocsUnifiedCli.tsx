import { motion } from 'framer-motion';

export default function DocsUnifiedCli() {
  return (
    <>
      <section id="unified-cli" className="mb-16">
        <h2 className="text-4xl font-black text-slate-900 mb-6">Unified CLI</h2>
        <div className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-500 font-mono text-sm ml-2">
              Terminal — aiready scan
            </span>
          </div>
          <div className="space-y-4 font-mono text-sm">
            <p className="text-blue-400">
              $ npx @aiready/cli scan ./src --score
            </p>
            <p className="text-slate-300">🔍 Scanning 47 files...</p>
            <p className="text-slate-300">🛡️ Pattern Detection: 85/100</p>
            <p className="text-slate-300">📈 Context Analysis: 72/100</p>
            <p className="text-slate-300">⚡ Consistency: 91/100</p>
            <div className="h-px bg-slate-800 my-4"></div>
            <p className="text-green-400 font-bold text-lg">
              ✨ AI Readiness Score: 82/100 (GOOD)
            </p>
          </div>
        </div>
      </section>

      <section id="consulting" className="mb-16">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-4">Need an Expert Audit?</h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl">
              While our tools give you the data, our experts provide the
              strategy. Get a comprehensive AI Readiness Audit for your
              enterprise codebase.
            </p>
            <a
              href="mailto:hello@getaiready.dev"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all"
            >
              Request Professional Audit
            </a>
          </div>
        </div>
      </section>

      <section id="options" className="mb-16">
        <h2 className="text-4xl font-black text-slate-900 mb-8">CLI Options</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { opt: '--score', desc: 'Calculate AI Readiness Score' },
            { opt: '--json', desc: 'Output report in JSON format' },
            { opt: '--include', desc: 'Glob patterns to include' },
            { opt: '--exclude', desc: 'Glob patterns to exclude' },
            { opt: '--threshold', desc: 'Set similarity threshold (0-1)' },
            { opt: '--verbose', desc: 'Show detailed output' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all group"
            >
              <code className="text-blue-600 font-bold group-hover:text-blue-700">
                {item.opt}
              </code>
              <span className="text-slate-500 text-sm">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
