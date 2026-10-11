import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LiveWorkspace,
  DEMO_PRESET_ACTIVITIES,
  DEFAULT_PROACTIVE_SIGNALS,
  ProactiveWorkspaceSignal,
} from '../LiveWorkspace';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Unified Co-Founder Workspace & Proactive Dock Integration (Step 9.3)', () => {
  describe('1. Preset Activities & Configuration', () => {
    it('contains all 4 required execution presets including visual inspection', () => {
      expect(DEMO_PRESET_ACTIVITIES).toHaveLength(4);
      const ids = DEMO_PRESET_ACTIVITIES.map((p) => p.id);
      expect(ids).toContain('research');
      expect(ids).toContain('coding');
      expect(ids).toContain('analysis');
      expect(ids).toContain('visual_inspection');
    });

    it('configures visual inspection preset with gemological quality audit details', () => {
      const visualPreset = DEMO_PRESET_ACTIVITIES.find(
        (p) => p.id === 'visual_inspection'
      );
      expect(visualPreset).toBeDefined();
      expect(visualPreset?.activeWorkers).toEqual(['designer', 'analyst']);
      expect(visualPreset?.statusBadge).toContain('Grade A+');
      expect(visualPreset?.activity.actionText).toContain('Appraising Gemstones');
    });

    it('defines 3 default ambient proactive intelligence signals', () => {
      expect(DEFAULT_PROACTIVE_SIGNALS).toHaveLength(3);
      const categories = DEFAULT_PROACTIVE_SIGNALS.map((s) => s.category);
      expect(categories).toContain('RISK');
      expect(categories).toContain('OPPORTUNITY');
      expect(categories).toContain('BUSINESS');
    });
  });

  describe('2. Component Static Rendering & Structure', () => {
    it('renders workspace with header, preset tabs, and real-time execution pill', () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveWorkspace, {
          activeWorkers: ['researcher', 'writer'],
        })
      );

      expect(html).toContain('Live Worker Workspace');
      expect(html).toContain('REAL-TIME AGENT EXECUTION');
      expect(html).toContain('Website Research');
      expect(html).toContain('Code in Progress');
      expect(html).toContain('Growth &amp; Analytics');
      expect(html).toContain('Visual Appraisal');
    });

    it('renders ambient proactive signals dock with signals and action buttons', () => {
      const html = renderToStaticMarkup(React.createElement(LiveWorkspace, {}));

      expect(html).toContain('Co-Founder Ambient Proactive Signals (3)');
      expect(html).toContain('Competitor Price Shift Detected');
      expect(html).toContain('PDP Image Quality Audit Required');
      expect(html).toContain('Low Stock Velocity Warning');
      expect(html).toContain('Analyze Price Beat');
      expect(html).toContain('Inspect Jewelry Image');
      expect(html).toContain('Reorder Stock');
    });

    it('renders custom proactive signals when passed via props', () => {
      const customSignals: ProactiveWorkspaceSignal[] = [
        {
          id: 'custom-sig-1',
          category: 'OPPORTUNITY',
          severity: 'high',
          title: 'SEO Ranking Surge Detected',
          summary: 'Keyword "22K peacock ring" jumped from position 14 to 3.',
          actionLabel: 'Boost Ads',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(LiveWorkspace, {
          proactiveSignals: customSignals,
        })
      );

      expect(html).toContain('Co-Founder Ambient Proactive Signals (1)');
      expect(html).toContain('SEO Ranking Surge Detected');
      expect(html).toContain('Boost Ads');
      expect(html).not.toContain('Competitor Price Shift Detected');
    });

    it('renders voice controls when onStartVoice is provided', () => {
      const htmlIdle = renderToStaticMarkup(
        React.createElement(LiveWorkspace, {
          onStartVoice: jest.fn(),
          voiceState: 'idle',
        })
      );
      expect(htmlIdle).toContain('Voice Brain');

      const htmlSpeaking = renderToStaticMarkup(
        React.createElement(LiveWorkspace, {
          onStartVoice: jest.fn(),
          voiceState: 'speaking',
        })
      );
      expect(htmlSpeaking).toContain('Speaking');
    });

    it('renders workforce badges for active workers in footer', () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveWorkspace, {
          activeWorkers: ['coder', 'analyst'],
        })
      );

      expect(html).toContain('Active Workforce:');
      expect(html).toContain('@Coder');
      expect(html).toContain('@Analyst');
    });
  });
});
