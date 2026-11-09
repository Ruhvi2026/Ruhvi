/**
 * Ruhvi AI Co-Founder — Recursive Self-Improvement (RSI) Subsystem
 * Production Architecture & Implementation Plan
 */

export * from './config';
export * from './types';
export * from './governance';
export * from './memory-manager';
export * from './self-observer';
export * from './reflection-engine';
export * from './capability-registry';
export * from './research-engine';
export * from './gap-detector';
export * from './eval-lab';
export * from './proposal-engine';
export * from './evolution-history';
export * from './provider-router';
export * from './evidence-ledger';

import { getRsiConfig } from './config';
import { RsiMemoryManager } from './memory-manager';
import { RsiSelfObserver } from './self-observer';
import { RsiReflectionEngine } from './reflection-engine';
import { RsiCapabilityRegistry } from './capability-registry';
import { RsiResearchEngine } from './research-engine';
import { RsiGapDetector } from './gap-detector';
import { RsiEvalLab } from './eval-lab';
import { RsiProposalEngine } from './proposal-engine';
import { RsiEvolutionHistory } from './evolution-history';

/**
 * Singleton coordinator for Co-Founder RSI capabilities
 */
class RsiCoordinator {
  public readonly config = getRsiConfig();
  public readonly memory = new RsiMemoryManager();
  public readonly observer = new RsiSelfObserver();
  public readonly reflection = new RsiReflectionEngine();
  public readonly registry = new RsiCapabilityRegistry();
  public readonly research = new RsiResearchEngine();
  public readonly gapDetector = new RsiGapDetector();
  public readonly evalLab = new RsiEvalLab();
  public readonly proposals = new RsiProposalEngine();
  public readonly evolution = new RsiEvolutionHistory();
}

let _rsiInstance: RsiCoordinator | null = null;

export function getRsiCoordinator(): RsiCoordinator {
  if (!_rsiInstance) {
    _rsiInstance = new RsiCoordinator();
  }
  return _rsiInstance;
}
