import React from 'react';
import { Navbar } from '../components/common/Navbar';
import { BookOpen, Rocket, Server, ShieldCheck, Terminal, Globe, Code2 } from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Developer Documentation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">DeployHub Platform Guides</h1>
          <p className="text-sm text-slate-600 mt-1">
            Learn how DeployHub compiles, validates, isolates, and serves your websites.
          </p>
        </div>

        {/* Section 1: Static Hosting */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Rocket className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">1. Deploying Static Websites</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            DeployHub natively hosts plain HTML5, CSS3, JavaScript, web fonts, and images. Simply package your files into a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-xs">.zip</code> archive.
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
            <div className="text-white font-bold">my-portfolio.zip</div>
            <div className="pl-4">├── index.html <span className="text-blue-400 font-semibold">(Required entrypoint)</span></div>
            <div className="pl-4">├── style.css</div>
            <div className="pl-4">├── script.js</div>
            <div className="pl-4">└── assets/</div>
          </div>
        </section>

        {/* Section 2: Isolated PHP Runtime */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">2. Isolated PHP Runtime</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Unlike static websites, PHP workloads execute server-side. DeployHub attaches an isolated tenant runtime with restricted filesystem permissions and non-root execution boundaries.
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
            <div className="text-emerald-400 font-bold">&lt;?php</div>
            <div className="pl-4">header('Content-Type: application/json');</div>
            <div className="pl-4">echo json_encode(['status' =&gt; 'live', 'runtime' =&gt; 'DeployHub PHP 8.2']);</div>
            <div className="text-emerald-400 font-bold">?&gt;</div>
          </div>
        </section>

        {/* Section 3: React & Vite Single Page Apps */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Code2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">3. React & Vite Applications</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            For Vite or Create React App bundles, you can directly upload the generated <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-xs">dist</code> folder or a ZIP with your build configuration. The edge proxy automatically handles SPA fallback routing so browser refresh works smoothly on client-side routes.
          </p>
        </section>

        {/* Section 4: Security Architecture */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">4. Multi-Layer Security Architecture</h2>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc pl-5">
            <li><strong className="text-slate-900">Directory Traversal Prevention:</strong> Every archive entry is inspected and canonicalized. Paths containing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-xs">../</code> or root indicators are blocked before disk extraction.</li>
            <li><strong className="text-slate-900">ZIP Bomb Protection:</strong> Decompressed file size cannot exceed quota boundaries, and compression ratios greater than 100:1 are aborted immediately.</li>
            <li><strong className="text-slate-900">Worker Isolation:</strong> User builds never run directly on the REST API server; jobs are queued to isolated worker runners.</li>
          </ul>
        </section>

      </main>
    </div>
  );
};
