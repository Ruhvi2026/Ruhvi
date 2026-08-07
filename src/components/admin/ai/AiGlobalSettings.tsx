import React from 'react';
import { AiComponentProps } from './types';
import {
  Save,
  Loader2,
  Settings,
  Database,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function AiGlobalSettings({
  globalConfig,
  setGlobalConfig,
  saveSettings,
  isSaving,
}: AiComponentProps) {
  const updateGlobal = (key: string, value: any) => {
    setGlobalConfig({ ...globalConfig, [key]: value });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Global Configuration
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Advanced system-wide AI settings and constraints.
          </p>
        </div>
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
          Save Global Config
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-medium text-white">
            <Clock className="h-5 w-5 text-blue-400" />
            Timeouts & Limits
          </h3>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Default API Timeout (ms)
            </label>
            <input
              type="number"
              value={globalConfig.timeout || 30000}
              onChange={(e) =>
                updateGlobal('timeout', parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Max Output Tokens (Global Cap)
            </label>
            <input
              type="number"
              value={globalConfig.maxTokens || 4096}
              onChange={(e) =>
                updateGlobal('maxTokens', parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Retry Delay on Failure (ms)
            </label>
            <input
              type="number"
              value={globalConfig.retryDelay || 1000}
              onChange={(e) =>
                updateGlobal('retryDelay', parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white"
            />
          </div>
        </div>

        <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-medium text-white">
            <Database className="h-5 w-5 text-purple-400" />
            System Behaviors
          </h3>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3">
            <div>
              <div className="font-medium text-white">Enable AI Caching</div>
              <div className="text-xs text-gray-400">
                Cache identical prompts for 24h to save costs
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={globalConfig.enableCaching || false}
                onChange={(e) =>
                  updateGlobal('enableCaching', e.target.checked)
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3">
            <div>
              <div className="font-medium text-white">
                Health Monitoring Cron
              </div>
              <div className="text-xs text-gray-400">
                Ping endpoints every 30 mins
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={globalConfig.enableHealthMonitor !== false}
                onChange={(e) =>
                  updateGlobal('enableHealthMonitor', e.target.checked)
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3">
            <div>
              <div className="font-medium text-white">Verbose Logging</div>
              <div className="text-xs text-gray-400">
                Log all raw prompts and responses (DB heavy)
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={globalConfig.verboseLogging || false}
                onChange={(e) =>
                  updateGlobal('verboseLogging', e.target.checked)
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
