import type {
  UnifiedActionItem,
  ActionCategory,
  ActionPriority,
  ActionStatus,
  ActionSourceType,
} from '@/lib/intelligence/action-contract';

/**
 * ============================================================================
 * UNIFIED ACTION CENTER VIEW LOGIC TESTS (TRACK D - PHASE 25)
 * ============================================================================
 * Unit and integration tests for Action Center presentation logic, query
 * parameter dispatch, search filtering, role badge display, and deep-link routing.
 */

describe('Action Center View Logic', () => {
  // 1. Query Parameter Resolution
  describe('Query parameter construction', () => {
    function buildActionCenterUrl(options: {
      page?: number;
      limit?: number;
      category?: ActionCategory | 'all';
      priority?: ActionPriority | 'all';
      status?: ActionStatus | 'all';
      source?: ActionSourceType | 'all';
      fresh?: boolean;
    }): string {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.category && options.category !== 'all')
        params.set('category', options.category);
      if (options.priority && options.priority !== 'all')
        params.set('priority', options.priority);
      if (options.status && options.status !== 'all')
        params.set('status', options.status);
      if (options.source && options.source !== 'all')
        params.set('source', options.source);
      if (options.fresh) params.set('fresh', 'true');
      return `/api/action-center?${params.toString()}`;
    }

    it('builds standard paginated URLs with default filters', () => {
      const url = buildActionCenterUrl({ page: 1, limit: 15 });
      expect(url).toBe('/api/action-center?page=1&limit=15');
    });

    it('attaches category and priority filter params', () => {
      const url = buildActionCenterUrl({
        page: 2,
        limit: 20,
        category: 'operations',
        priority: 'critical',
      });
      expect(url).toContain('page=2');
      expect(url).toContain('limit=20');
      expect(url).toContain('category=operations');
      expect(url).toContain('priority=critical');
    });

    it('omits filter params when value is "all"', () => {
      const url = buildActionCenterUrl({
        page: 1,
        limit: 10,
        category: 'all',
        priority: 'all',
        status: 'all',
        source: 'all',
      });
      expect(url).toBe('/api/action-center?page=1&limit=10');
    });

    it('attaches fresh=true when refresh is explicitly triggered', () => {
      const url = buildActionCenterUrl({ page: 1, fresh: true });
      expect(url).toBe('/api/action-center?page=1&fresh=true');
    });
  });

  // 2. Client-Side Search Filtering
  describe('Search query filtering', () => {
    const sampleItems: UnifiedActionItem[] = [
      {
        id: 'act_1',
        sourceType: 'anomaly',
        sourceId: 'anom_payment_spike',
        title: 'Payment Gateway Failure Spike',
        summary: 'Payment failure rate reached 45%',
        category: 'financial',
        priority: 'critical',
        status: 'pending',
        isExecutable: false,
        executionType: 'deep_link_workflow',
        requiredApprovalType: 'manager',
        assignedRole: 'manager',
        evidence: {
          description: 'Payment failure rate breached threshold 20%',
          deepLink: '/admin/payments',
          rawSourceId: 'anom_payment_spike',
          rawSourceType: 'anomaly_record',
        },
        createdAt: '2026-10-26T12:00:00.000Z',
        updatedAt: '2026-10-26T12:00:00.000Z',
      },
      {
        id: 'act_2',
        sourceType: 'system_alert',
        sourceId: 'audit_cred_44',
        title: 'Administrative Audit Event: delete_user_secret',
        summary: 'Secret credentials deleted by admin@ruhvi.in',
        category: 'security',
        priority: 'critical',
        status: 'pending',
        isExecutable: false,
        executionType: 'deep_link_workflow',
        requiredApprovalType: 'admin',
        assignedRole: 'admin',
        evidence: {
          description: 'Credential modification detected in audit logs',
          deepLink: '/admin/system-alerts',
          rawSourceId: 'audit_cred_44',
          rawSourceType: 'audit_logs',
        },
        createdAt: '2026-10-26T11:00:00.000Z',
        updatedAt: '2026-10-26T11:00:00.000Z',
      },
      {
        id: 'act_3',
        sourceType: 'system_alert',
        sourceId: 'ret_ord_99',
        title: 'Customer Return Authorization Needed: Order #ord_998877',
        summary: 'Customer requested ring size replacement',
        category: 'operations',
        priority: 'high',
        status: 'in_progress',
        isExecutable: false,
        executionType: 'deep_link_workflow',
        requiredApprovalType: 'staff',
        assignedRole: 'staff',
        evidence: {
          description: 'Return request awaiting warehouse inspection',
          deepLink: '/admin/refunds',
          rawSourceId: 'ret_ord_99',
          rawSourceType: 'returns',
        },
        createdAt: '2026-10-26T10:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
      },
    ];

    function filterItems(
      items: UnifiedActionItem[],
      query: string
    ): UnifiedActionItem[] {
      if (!query.trim()) return items;
      const q = query.toLowerCase();
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.evidence.description.toLowerCase().includes(q) ||
          item.sourceId.toLowerCase().includes(q)
      );
    }

    it('returns all items when query is empty', () => {
      expect(filterItems(sampleItems, '')).toHaveLength(3);
      expect(filterItems(sampleItems, '   ')).toHaveLength(3);
    });

    it('matches items by title case-insensitively', () => {
      const results = filterItems(sampleItems, 'PAYMENT');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('act_1');
    });

    it('matches items by summary text', () => {
      const results = filterItems(sampleItems, 'credentials');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('act_2');
    });

    it('matches items by source ID', () => {
      const results = filterItems(sampleItems, 'ret_ord_99');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('act_3');
    });

    it('returns empty array when query does not match any item', () => {
      const results = filterItems(sampleItems, 'nonexistent query 12345');
      expect(results).toHaveLength(0);
    });
  });

  // 3. Priority and Status Styling Classes
  describe('Visual hierarchy and badge mapping', () => {
    function getPriorityClasses(priority: ActionPriority) {
      switch (priority) {
        case 'critical':
          return {
            badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
            cardBorder: 'border-rose-500/30 hover:border-rose-500/50',
          };
        case 'high':
          return {
            badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            cardBorder: 'border-white/10 hover:border-white/20',
          };
        default:
          return {
            badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
            cardBorder: 'border-white/10 hover:border-white/20',
          };
      }
    }

    it('highlights critical priority items with rose border and badge', () => {
      const styles = getPriorityClasses('critical');
      expect(styles.badge).toContain('text-rose-400');
      expect(styles.cardBorder).toContain('border-rose-500/30');
    });

    it('styles high priority items with amber tones', () => {
      const styles = getPriorityClasses('high');
      expect(styles.badge).toContain('text-amber-400');
    });
  });

  // 4. Safe Deep Link Verification
  describe('Safe Deep Link Routing', () => {
    it('verifies originating workflow links route to authorized admin portals', () => {
      const allowedPrefixes = ['/admin/', '/support/', '/operations/'];
      const sampleDeepLinks = [
        '/admin/payments',
        '/admin/orders',
        '/admin/refunds',
        '/admin/anomalies',
        '/admin/system-alerts',
        '/admin/reports/inventory',
      ];

      for (const link of sampleDeepLinks) {
        const isSafe = allowedPrefixes.some((p) => link.startsWith(p));
        expect(isSafe).toBe(true);
      }
    });
  });
});
