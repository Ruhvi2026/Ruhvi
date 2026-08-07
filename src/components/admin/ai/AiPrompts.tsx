import React, { useState } from 'react';
import { AiComponentProps } from './types';
import { Save, History, Check, Loader2, Sparkles, Wand2 } from 'lucide-react';

export default function AiPrompts({
  prompts,
  setPrompts,
  saveSettings,
  isSaving,
}: AiComponentProps) {
  const [activePrompt, setActivePrompt] = useState('product_description');

  const promptTypes = [
    { id: 'global_system', name: 'Global System Prompt' },
    { id: 'product_description', name: 'Product SEO & Description' },
    { id: 'chatbot', name: 'Customer Support Chatbot' },
    { id: 'recommendations', name: 'Product Recommendations' },
    { id: 'faq', name: 'FAQ Generator' },
  ];

  const updatePrompt = (val: string) => {
    setPrompts({ ...prompts, [activePrompt]: val });
  };

  const currentText = prompts[activePrompt] || '';
  const charCount = currentText.length;
  const tokenEstimate = Math.ceil(charCount / 4); // rough heuristic

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Prompt Engineering & Management
        </h2>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Prompts
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar Nav */}
        <div className="space-y-2 lg:col-span-1">
          {promptTypes.map((pt) => (
            <button
              key={pt.id}
              onClick={() => setActivePrompt(pt.id)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                activePrompt === pt.id
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              <span>{pt.name}</span>
              {prompts[pt.id] && <Check className="h-4 w-4 text-emerald-400" />}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="space-y-6 lg:col-span-3">
          <div className="flex h-[500px] flex-col rounded-xl border border-gray-700 bg-gray-800 p-1">
            <div className="flex items-center justify-between rounded-t-xl border-b border-gray-700 bg-gray-900/50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                {promptTypes.find((p) => p.id === activePrompt)?.name}
              </h3>
              <button className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:text-white">
                <History className="h-4 w-4" /> Version History
              </button>
            </div>

            <textarea
              value={currentText}
              onChange={(e) => updatePrompt(e.target.value)}
              placeholder="Enter system instructions here... Use {variables} if supported."
              className="w-full flex-1 resize-none bg-transparent p-6 font-mono text-sm text-gray-200 focus:outline-none focus:ring-0"
            />

            <div className="flex items-center justify-between rounded-b-xl border-t border-gray-700 bg-gray-900 p-3 text-xs text-gray-500">
              <div className="flex gap-4">
                <span>
                  Characters:{' '}
                  <strong className="text-gray-300">{charCount}</strong>
                </span>
                <span>
                  Est. Tokens:{' '}
                  <strong className="text-purple-400">{tokenEstimate}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${currentText ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                ></div>
                {currentText ? 'Ready' : 'Draft Empty'}
              </div>
            </div>
          </div>

          {/* Live Preview Placeholder */}
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-400">
              <Wand2 className="h-4 w-4 text-blue-400" /> Live Preview Rendering
            </h3>
            <div className="whitespace-pre-wrap rounded border border-gray-700 bg-gray-900 p-4 font-mono text-xs text-gray-500">
              {currentText
                ? currentText.replace(
                    /\{([^}]+)\}/g,
                    (match: string, p1: string) =>
                      `<span class="text-blue-400 font-bold bg-blue-500/10 px-1 rounded">${p1.toUpperCase()}_VALUE</span>`
                  )
                : 'Preview will appear here as you type...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
