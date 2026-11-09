// src/lib/ai/co-founder/workforce/state-store.ts
//
// Authoritative Distributed State Store for Workforce Kill Switch & Maintenance.
// Synchronizes state across distributed serverless instances (Supabase / Memory).
// Section 7 (Phase 8) of the Upgrade Guide.

import 'server-only';
import { WorkerId } from './types';
import { getServiceClient } from '@/lib/supabase/service';

export interface DistributedWorkforceState {
  globalKillSwitch: boolean;
  maintenanceWorkers: WorkerId[];
  updatedAt: string;
  updatedBy?: string;
}

class WorkforceStateStore {
  private killSwitchActive = false;
  private maintenanceSet = new Set<WorkerId>();
  private lastFetchedAt = 0;
  private readonly CACHE_TTL_MS = 5000; // 5-second TTL for fast local reads

  constructor() {
    this.killSwitchActive = false;
  }

  /**
   * Synchronous fast-read for hot-path policy evaluations.
   */
  isKillSwitchActive(): boolean {
    return this.killSwitchActive;
  }

  isWorkerInMaintenance(workerId: WorkerId): boolean {
    return this.maintenanceSet.has(workerId);
  }

  isWorkerActive(workerId: WorkerId): boolean {
    if (this.killSwitchActive) return false;
    return !this.maintenanceSet.has(workerId);
  }

  /**
   * Sets the global emergency kill switch and persists across instances.
   */
  async setKillSwitch(active: boolean, authorId = 'system'): Promise<void> {
    this.killSwitchActive = active;
    try {
      const supabase = getServiceClient();
      await supabase.from('system_settings').upsert(
        {
          key: 'workforce_global_kill_switch',
          value: {
            active,
            updatedBy: authorId,
            updatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch {
      // Fallback in-memory active in testing / offline environments
    }
  }

  /**
   * Sets maintenance mode for an individual specialist worker and persists.
   */
  async setWorkerMaintenance(
    workerId: WorkerId,
    inMaintenance: boolean,
    authorId = 'system'
  ): Promise<void> {
    if (inMaintenance) {
      this.maintenanceSet.add(workerId);
    } else {
      this.maintenanceSet.delete(workerId);
    }

    try {
      const supabase = getServiceClient();
      const currentList = Array.from(this.maintenanceSet);
      await supabase.from('system_settings').upsert(
        {
          key: 'workforce_maintenance_workers',
          value: {
            workers: currentList,
            updatedBy: authorId,
            updatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch {
      // Fallback in-memory active in testing / offline environments
    }
  }

  /**
   * Refreshes local in-memory cache from authoritative database if TTL expired.
   */
  async refreshFromStore(): Promise<DistributedWorkforceState> {
    const now = Date.now();
    if (now - this.lastFetchedAt < this.CACHE_TTL_MS) {
      return {
        globalKillSwitch: this.killSwitchActive,
        maintenanceWorkers: Array.from(this.maintenanceSet),
        updatedAt: new Date(this.lastFetchedAt).toISOString(),
      };
    }

    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'workforce_global_kill_switch',
          'workforce_maintenance_workers',
        ]);

      if (!error && data) {
        for (const row of data) {
          if (row.key === 'workforce_global_kill_switch' && row.value) {
            this.killSwitchActive = Boolean(row.value.active);
          }
          if (
            row.key === 'workforce_maintenance_workers' &&
            row.value?.workers
          ) {
            this.maintenanceSet = new Set(row.value.workers as WorkerId[]);
          }
        }
      }
      this.lastFetchedAt = now;
    } catch {
      // Keep existing memory state on fetch error
    }

    return {
      globalKillSwitch: this.killSwitchActive,
      maintenanceWorkers: Array.from(this.maintenanceSet),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Resets all state (used for testing teardown).
   */
  reset(): void {
    this.killSwitchActive = false;
    this.maintenanceSet.clear();
    this.lastFetchedAt = 0;
  }
}

export const workforceStateStore = new WorkforceStateStore();
