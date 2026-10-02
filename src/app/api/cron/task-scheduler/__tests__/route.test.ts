import { GET, POST } from '../route';

jest.mock('@/lib/auth/task-auth', () => ({
  getAuthenticatedStaff: jest.fn(),
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

jest.mock('@/lib/notifications/service', () => ({
  createAndSendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

import { getAuthenticatedStaff } from '@/lib/auth/task-auth';
import { getServiceClient } from '@/lib/supabase/service';
import { createAndSendNotification } from '@/lib/notifications/service';

describe('Task Scheduler Cron (/api/cron/task-scheduler)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorized calls when neither cron secret nor staff session is present', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue(null);
    const req = new Request('http://localhost/api/cron/task-scheduler');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('executes when authorized via staff session', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue({
      id: 'staff-admin',
      role: 'admin',
    });

    const mockSupabase: any = {
      from: jest.fn((table: string) => {
        if (table === 'task_recurrences') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost/api/cron/task-scheduler');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.tasksGenerated).toBe(0);
    expect(json.remindersSent).toBe(0);
  });

  it('dispatches overdue reminder when task passes deadline and incomplete', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue({
      id: 'staff-admin',
      role: 'admin',
    });

    const overdueTask = {
      id: 'task-overdue-1',
      task_id_text: 'TSK-ORD-101',
      title: 'Dispatch today orders',
      assignee_id: 'staff-user-1',
      department_id: 'dept-1',
      due_date: '2020-01-01', // definitely in past
      due_time: '09:00:00',
      status: { name: 'In Progress' },
    };

    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });

    const insertMock = jest.fn().mockResolvedValue({ error: null });

    const mockSupabase: any = {
      from: jest.fn((table: string) => {
        if (table === 'task_recurrences') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            lte: jest
              .fn()
              .mockResolvedValue({ data: [overdueTask], error: null }),
            update: updateMock,
          };
        }
        if (table === 'task_activity') {
          return {
            insert: insertMock,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost/api/cron/task-scheduler', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.remindersSent).toBe(1);
    expect(createAndSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'staff-user-1',
        title: expect.stringContaining('Task Reminder: Dispatch today orders'),
        category: 'TASK',
      })
    );
  });
});
