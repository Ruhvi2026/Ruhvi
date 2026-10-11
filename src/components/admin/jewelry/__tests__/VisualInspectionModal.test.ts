import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  VisualInspectionModal,
  calculateQualityBenchmark,
  formatMetalDisplay,
  getSeverityBadgeClass,
  formatCategoryLabel,
  JewelryVisualAnalysisResult,
  VisualFlaw,
} from '../VisualInspectionModal';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Jewelry Visual Inspection Modal & Quality Benchmark Canvas (Step 9.2)', () => {
  const sampleAnalysis: JewelryVisualAnalysisResult = {
    success: true,
    productCategory: 'ring',
    metalType: 'yellow_gold',
    estimatedKarat: '22K',
    metalFinish: 'mirror_polish',
    gemstones: [
      {
        type: 'diamond',
        apparentClarityGrade: 'VVS',
        settingType: 'pave',
        cut: 'round_brilliant',
        count: 14,
      },
    ],
    craftsmanshipScore: 94,
    photoQuality: {
      lightingScore: 92,
      sharpnessScore: 95,
      backgroundContrastScore: 88,
      ecommerceComplianceScore: 90,
      overallScore: 91,
      issues: ['Slight reflection on right bezel'],
    },
    detectedFlaws: [
      {
        category: 'metal_finish',
        severity: 'low',
        description: 'Micro-buff mark under shank',
      },
    ],
    visualTags: ['22kGold', 'SolitaireRing', 'BridalJewelry', 'Handcrafted'],
    marketDifferentiators: [
      'Authentic Bengali filigree detail',
      'Certified VVS diamonds',
    ],
    recommendations: [
      'Increase key light brightness by 5%',
      'Mention 22K hallmark in title',
    ],
    summary:
      'High-grade luxury solitaire ring with pristine pavé diamond setting and rich 22K mirror polish.',
    summaryForVoice:
      'Executive appraisal complete. Grade A plus luxury craftsmanship with 94 score.',
  };

  describe('1. Quality Benchmark Engine', () => {
    it('awards Grade A+ for combined scores >= 85 without high-severity flaws', () => {
      const benchmark = calculateQualityBenchmark(90, 90, []);
      expect(benchmark.grade).toBe('A+');
      expect(benchmark.color).toBe('emerald');
      expect(benchmark.score).toBe(90);
      expect(benchmark.label).toContain('Grade A+');
    });

    it('awards Grade B for combined scores between 70 and 84', () => {
      const benchmark = calculateQualityBenchmark(75, 75, [
        { category: 'surface', severity: 'medium', description: 'Uneven shine' },
      ]);
      expect(benchmark.grade).toBe('B');
      expect(benchmark.color).toBe('amber');
      expect(benchmark.score).toBe(75);
      expect(benchmark.label).toContain('Grade B');
    });

    it('forces REJECT status when a high-severity flaw is present regardless of score', () => {
      const highFlaw: VisualFlaw = {
        category: 'stone_setting',
        severity: 'high',
        description: 'Loose prong detected on primary diamond',
      };
      const benchmark = calculateQualityBenchmark(95, 95, [highFlaw]);
      expect(benchmark.grade).toBe('REJECT');
      expect(benchmark.color).toBe('rose');
      expect(benchmark.label).toContain('Needs Attention');
    });

    it('returns REJECT when combined score falls below 70', () => {
      const benchmark = calculateQualityBenchmark(60, 65, []);
      expect(benchmark.grade).toBe('REJECT');
      expect(benchmark.color).toBe('rose');
    });
  });

  describe('2. Metadata Formatters', () => {
    it('formats metal display with karat, name, and finish', () => {
      const formatted = formatMetalDisplay('yellow_gold', '22K', 'mirror_polish');
      expect(formatted).toBe('22K Yellow Gold (mirror polish)');
    });

    it('handles silver and fallback metal labels', () => {
      expect(formatMetalDisplay('sterling_silver')).toBe('925 Sterling Silver');
      expect(formatMetalDisplay('rose_gold', '18K')).toBe('18K Rose Gold');
      expect(formatMetalDisplay('custom_alloy')).toBe('custom alloy');
    });

    it('maps severity levels to correct color classes', () => {
      expect(getSeverityBadgeClass('high')).toContain('rose');
      expect(getSeverityBadgeClass('medium')).toContain('amber');
      expect(getSeverityBadgeClass('low')).toContain('blue');
    });

    it('formats snake_case category to Title Case', () => {
      expect(formatCategoryLabel('stone_setting')).toBe('Stone Setting');
      expect(formatCategoryLabel('photo_artifact')).toBe('Photo Artifact');
    });
  });

  describe('3. Static Component Markup & Rendering', () => {
    it('renders null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        React.createElement(VisualInspectionModal, {
          isOpen: false,
          onClose: jest.fn(),
          imageUrl: 'https://example.com/ring.jpg',
        })
      );
      expect(html).toBe('');
    });

    it('renders empty appraisal state with scan prompt when no analysis provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(VisualInspectionModal, {
          isOpen: true,
          onClose: jest.fn(),
          productName: 'Ruhvi Peacock Ring',
          imageUrl: 'https://example.com/ring.jpg',
        })
      );

      expect(html).toContain('AI Co-Founder Visual Appraisal');
      expect(html).toContain('Ruhvi Peacock Ring');
      expect(html).toContain('Ready to Inspect Jewelry');
      expect(html).toContain('Start Visual Appraisal');
      expect(html).toContain('img src="https://example.com/ring.jpg"');
    });

    it('renders full appraisal dashboard when analysis data is supplied', () => {
      const html = renderToStaticMarkup(
        React.createElement(VisualInspectionModal, {
          isOpen: true,
          onClose: jest.fn(),
          productName: 'Ruhvi Royal Solitaire',
          imageUrl: 'https://example.com/ring.jpg',
          initialAnalysis: sampleAnalysis,
          onApplyPDPData: jest.fn(),
        })
      );

      // Check header and benchmark
      expect(html).toContain('Grade A+ • E-Commerce Ready');
      expect(html).toContain('94/100');

      // Check metal composition
      expect(html).toContain('22K Yellow Gold (mirror polish)');

      // Check gemstones
      expect(html).toContain('14x Diamond (Round Brilliant)');
      expect(html).toContain('Clarity: VVS');
      expect(html).toContain('Setting: Pave');

      // Check photo compliance scores
      expect(html).toContain('Lighting');
      expect(html).toContain('92%');
      expect(html).toContain('Sharpness');
      expect(html).toContain('95%');
      expect(html).toContain('Contrast');
      expect(html).toContain('88%');
      expect(html).toContain('PDP Standard');
      expect(html).toContain('90%');
      expect(html).toContain('Slight reflection on right bezel');

      // Check flaws
      expect(html).toContain('Micro-buff mark under shank');

      // Check visual tags and differentiators
      expect(html).toContain('#22kGold');
      expect(html).toContain('#SolitaireRing');
      expect(html).toContain('Authentic Bengali filigree detail');
      expect(html).toContain('Certified VVS diamonds');

      // Check voice briefing bar
      expect(html).toContain('Co-Founder Voice Appraisal Briefing');
      expect(html).toContain(
        'Executive appraisal complete. Grade A plus luxury craftsmanship with 94 score.'
      );

      // Check actions
      expect(html).toContain('Apply Metadata to PDP');
    });

    it('renders high-severity defect alerts and defect count', () => {
      const defectAnalysis: JewelryVisualAnalysisResult = {
        ...sampleAnalysis,
        craftsmanshipScore: 68,
        detectedFlaws: [
          {
            category: 'stone_setting',
            severity: 'high',
            description: 'Loose prong on main stone',
          },
          {
            category: 'surface',
            severity: 'medium',
            description: 'Pitting on under-gallery',
          },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(VisualInspectionModal, {
          isOpen: true,
          onClose: jest.fn(),
          imageUrl: 'https://example.com/ring.jpg',
          initialAnalysis: defectAnalysis,
        })
      );

      expect(html).toContain('Needs Attention • Retake / Reject');
      expect(html).toContain('Detected Craftsmanship &amp; Surface Flaws (2)');
      expect(html).toContain('Loose prong on main stone');
      expect(html).toContain('Pitting on under-gallery');
    });

    it('renders clean status when no flaws are detected', () => {
      const flawlessAnalysis: JewelryVisualAnalysisResult = {
        ...sampleAnalysis,
        detectedFlaws: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(VisualInspectionModal, {
          isOpen: true,
          onClose: jest.fn(),
          imageUrl: 'https://example.com/ring.jpg',
          initialAnalysis: flawlessAnalysis,
        })
      );

      expect(html).toContain('No craftsmanship or surface defects detected');
    });
  });
});
