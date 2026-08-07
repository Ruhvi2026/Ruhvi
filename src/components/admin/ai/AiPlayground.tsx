import React, { useState } from 'react';
import { AiComponentProps } from './types';
import { PlaySquare, Loader2, Zap, Clock, DollarSign, Cpu } from 'lucide-react';

export default function AiPlayground({
  providers,
  features,
}: AiComponentProps) {
  const [feature, setFeature] = useState('product_description');
  const [input, setInput] = useState(
    '{\n  "name": "Diamond Ring",\n  "price": "50000"\n}'
  );
  const [output, setOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState<{
    time: number;
    tokens?: number;
    cost?: number;
  } | null>(null);

  const runTest = async () => {
    setIsRunning(true);
    setOutput(null);
    setTelemetry(null);
    const start = Date.now();
    try {
      const res = await fetch('/api/admin/ai/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureKey: feature,
          productData: JSON.parse(input),
        }),
      });
      const data = await res.json();
      const end = Date.now();

      if (res.ok) {
        setOutput(data.data);
        // Normally the backend would return exact tokens and cost in the response wrapper,
        // for this UI mockup we estimate it based on characters if not provided.
        const outputStr = JSON.stringify(data.data);
        const estTokens = Math.ceil((input.length + outputStr.length) / 4);
        setTelemetry({
          time: end - start,
          tokens: estTokens,
          cost: estTokens * 0.000000075,
        });
      } else {
        setOutput({ error: data.error });
        setTelemetry({ time: end - start });
      }
    } catch (err: any) {
      setOutput({
        error: 'Failed to run test. Invalid JSON input or network error.',
      });
      setTelemetry({ time: Date.now() - start });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Testing Playground
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Safely simulate requests through your exact fallback and routing
            chains.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900/50 p-4">
            <h3 className="flex items-center gap-2 font-medium text-white">
              <PlaySquare className="h-5 w-5 text-blue-400" />
              Request Configuration
            </h3>
            <select
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
            >
              <option value="product_description">Product Content</option>
              <option value="chatbot">Chatbot Pipeline</option>
            </select>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="h-80 w-full resize-none bg-gray-900 p-4 font-mono text-sm text-green-400 focus:outline-none"
            spellCheck="false"
          />
          <div className="flex justify-end border-t border-gray-700 bg-gray-800 p-4">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlaySquare className="h-4 w-4" />
              )}
              Execute Run
            </button>
          </div>
        </div>

        {/* Output & Telemetry */}
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
              <Clock className="mb-2 h-5 w-5 text-gray-400" />
              <div className="text-xl font-bold text-white">
                {telemetry?.time ? `${telemetry.time}ms` : '--'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Latency</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
              <Cpu className="mb-2 h-5 w-5 text-purple-400" />
              <div className="text-xl font-bold text-white">
                {telemetry?.tokens || '--'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Est. Tokens</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
              <DollarSign className="mb-2 h-5 w-5 text-green-400" />
              <div className="text-xl font-bold text-white">
                {telemetry?.cost ? `$${telemetry.cost.toFixed(5)}` : '--'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Est. Cost</div>
            </div>
          </div>

          <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900/50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-white">
                <Zap className="h-5 w-5 text-yellow-400" />
                Execution Response
              </h3>
            </div>
            <div className="flex-1 overflow-auto bg-black p-4">
              {isRunning ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-500">
                  <Loader2 className="mb-4 h-8 w-8 animate-spin" />
                  <span>Processing request through AI chain...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                  {output
                    ? JSON.stringify(output, null, 2)
                    : 'Awaiting execution...'}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
