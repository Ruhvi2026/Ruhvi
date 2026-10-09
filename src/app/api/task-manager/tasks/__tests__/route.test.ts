/**
 * Task Manager — Create Task (POST /api/task-manager/tasks)
 *
 * Regression coverage for task creation. The route previously exported only
 * GET, so every create attempt from the task form returned 405 and surfaced in
 * the UI as "Network error occurred".
 *
 * Run with: npx jest src/app/api/task-manager/tasks
 */

import { POST } from '../route';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const STAFF = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'manager',
  account_status: 'active',
  department_id: '22222222-2222-4222-8222-222222222222',
  full_name: 'Test Manager',
  email: 'manager@ruhvi.test',
};

let currentStaff: typeof STAFF | null = STAFF;
let seed: Record<string, any[]>;
let ops: { table: string; op: string; payload?: any }[];
let collisions: number;

jest.mock('@/lib/auth/task-auth', () => ({
  getAuthenticatedStaff: jest.fn(async () => currentStaff),
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: () => supabaseStub,
}));

// ─── Minimal Supabase query-builder stub ────────────────────────────────────
// Filters are encoded uniformly as [operator, column, value] so the matcher
// never has to guess an element layout.

function matches(row: any, filters: any[]): boolean {
  return filters.every((f) => {
    const [op, col, val] = f;
    if (op === 'neq') return row[col] !== val;
    if (op === 'in') return val.includes(row[col]);
    return row[col] === val;
  });
}

const supabaseStub: any = {
  from(table: string) {
    const builder: any = {
      _filters: [] as any[],
      _insert: undefined as any,
      _limit: null as number | null,

      select(_cols?: string) {
        return builder;
      },
      insert(payload: any) {
        // Snapshot: the route reuses and mutates the same payload object on a
        // task_id_text retry, so storing the reference would lose the first id.
        ops.push({ table, op: 'insert', payload: { ...payload } });
        builder._insert = payload;
        return builder;
      },
      eq(col: string, val: any) {
        builder._filters.push(['eq', col, val]);
        return builder;
      },
      neq(col: string, val: any) {
        builder._filters.push(['neq', col, val]);
        return builder;
      },
      in(col: string, vals: any[]) {
        builder._filters.push(['in', col, vals]);
        return builder;
      },
      order() {
        return builder;
      },
      or() {
        return builder;
      },
      ilike() {
        return builder;
      },
      limit(n: number) {
        builder._limit = n;
        return builder;
      },

      async _run() {
        const rows = seed[table] || [];

        if (builder._insert !== undefined) {
          if (table === 'tasks' && collisions > 0) {
            collisions -= 1;
            return {
              data: null,
              error: { code: '23505', message: 'duplicate key value' },
            };
          }
          const inserted = {
            id: `generated-${table}-${rows.length + 1}`,
            ...builder._insert,
          };
          rows.push(inserted);
          return { data: [inserted], error: null };
        }

        const found = rows.filter((r) => matches(r, builder._filters));
        const limited =
          builder._limit === null ? found : found.slice(0, builder._limit);
        return { data: limited, error: null };
      },

      async single() {
        const { data, error } = await builder._run();
        return { data: data?.[0] ?? null, error };
      },
      async maybeSingle() {
        const { data, error } = await builder._run();
        return { data: data?.[0] ?? null, error };
      },
      then(
        onFulfilled: any,
        onRejected: any
      ): Promise<{ data: any; error: any }> {
        return builder
          ._run()
          .then(() => ({ data: null, error: null }))
          .then(onFulfilled, onRejected);
      },
    };
    return builder;
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function request(body: unknown) {
  return new Request('http://localhost/api/task-manager/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const PRIORITY_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const STATUS_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const ASSIGNEE_ID = '33333333-3333-4333-8333-333333333333';
const CUSTOMER_ID = '44444444-4444-4444-8444-444444444444';
const INACTIVE_ID = '55555555-5555-4555-8555-555555555555';
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222';

// Mirrors exactly what TaskForm.handleSubmit sends for a new task: every blank
// field is converted to null, and tags become a string array.
function formBody(overrides: Record<string, any> = {}) {
  return {
    title: '  Verify order #1042 packaging  ',
    description: '  Confirm the outer box matches the new spec.  ',
    assignee_id: null,
    department_id: DEPARTMENT_ID,
    priority_id: PRIORITY_ID,
    status_id: STATUS_ID,
    type_id: null,
    due_date: null,
    due_time: null,
    start_time: null,
    expected_duration: null,
    related_order_id: null,
    related_product_id: null,
    related_ticket_id: null,
    tags: [],
    ...overrides,
  };
}

beforeEach(() => {
  currentStaff = STAFF;
  collisions = 0;
  ops = [];
  seed = {
    task_priorities: [{ id: PRIORITY_ID, name: 'Low' }],
    task_statuses: [{ id: STATUS_ID, name: 'Open' }],
    users: [
      { id: STAFF.id, role: STAFF.role, account_status: 'active' },
      { id: ASSIGNEE_ID, role: 'staff', account_status: 'active' },
      { id: CUSTOMER_ID, role: 'customer', account_status: 'active' },
      { id: INACTIVE_ID, role: 'staff', account_status: 'suspended' },
    ],
    tasks: [],
    task_assignments: [],
    task_activity: [],
    notifications: [],
  };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/task-manager/tasks', () => {
  it('exists — the create form had no handler to route to', () => {
    expect(typeof POST).toBe('function');
  });

  it('creates a task from the payload the task form submits', async () => {
    const res = await POST(request(formBody()));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.task).toBeTruthy();
    expect(json.task.title).toBe('Verify order #1042 packaging');
    expect(json.task.description).toBe(
      'Confirm the outer box matches the new spec.'
    );
    expect(json.task.task_id_text).toMatch(/^TM-[0-9A-Z]+-[0-9A-Z]{4}$/);

    expect(seed.tasks).toHaveLength(1);
    expect(seed.tasks[0]).toMatchObject({
      title: 'Verify order #1042 packaging',
      created_by: STAFF.id,
      priority_id: PRIORITY_ID,
      status_id: STATUS_ID,
      // Falls back to the creator's department when none is chosen.
      department_id: STAFF.department_id,
      assignee_id: null,
      tags: [],
    });
  });

  it('records the creation in the task activity log', async () => {
    await POST(request(formBody()));

    expect(seed.task_activity).toHaveLength(1);
    expect(seed.task_activity[0]).toMatchObject({
      user_id: STAFF.id,
      action: 'created',
    });
    expect(seed.task_activity[0].task_id).toBe(seed.tasks[0].id);
  });

  it('defaults priority and status when the form leaves them blank', async () => {
    const res = await POST(
      request(formBody({ priority_id: null, status_id: null }))
    );

    expect(res.status).toBe(201);
    expect(seed.tasks[0]).toMatchObject({
      priority_id: PRIORITY_ID,
      status_id: STATUS_ID,
    });
  });

  it('assigns the task, notifies the assignee and records the assignment', async () => {
    const res = await POST(request(formBody({ assignee_id: ASSIGNEE_ID })));

    expect(res.status).toBe(201);
    expect(seed.tasks[0].assignee_id).toBe(ASSIGNEE_ID);
    expect(seed.task_assignments).toHaveLength(1);
    expect(seed.task_assignments[0]).toMatchObject({
      task_id: seed.tasks[0].id,
      user_id: ASSIGNEE_ID,
      assigned_by: STAFF.id,
    });
    expect(seed.notifications).toHaveLength(1);
    expect(seed.notifications[0]).toMatchObject({
      user_id: ASSIGNEE_ID,
      reference_id: seed.tasks[0].id,
    });
  });

  it('does not notify the creator when they assign the task to themselves', async () => {
    const res = await POST(request(formBody({ assignee_id: STAFF.id })));

    expect(res.status).toBe(201);
    expect(seed.task_assignments).toHaveLength(1);
    expect(seed.notifications).toHaveLength(0);
  });

  it('rejects a customer as assignee', async () => {
    const res = await POST(request(formBody({ assignee_id: CUSTOMER_ID })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Assignee is not an active staff member'
    );
    expect(seed.tasks).toHaveLength(0);
  });

  it('rejects a deactivated staff member as assignee', async () => {
    const res = await POST(request(formBody({ assignee_id: INACTIVE_ID })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Assignee is not an active staff member'
    );
    expect(seed.tasks).toHaveLength(0);
  });

  it('reports a bad related id as a 400 instead of a server error', async () => {
    const res = await POST(request(formBody({ related_order_id: 'ORD-1042' })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Related order must be a valid UUID');
    expect(seed.tasks).toHaveLength(0);
  });

  it('stores due date, duration and tags when provided', async () => {
    const res = await POST(
      request(
        formBody({
          due_date: '2026-10-04',
          due_time: '17:30',
          start_time: '2026-10-01',
          expected_duration: '2 days',
          tags: ['packaging', 'q4'],
        })
      )
    );

    expect(res.status).toBe(201);
    expect(seed.tasks[0]).toMatchObject({
      due_date: '2026-10-04',
      due_time: '17:30',
      start_time: '2026-10-01',
      expected_duration: '2 days',
      tags: ['packaging', 'q4'],
    });
  });

  it('retries once when the generated task id collides', async () => {
    collisions = 1;

    const res = await POST(request(formBody()));

    expect(res.status).toBe(201);
    expect(seed.tasks).toHaveLength(1);
    const taskInserts = ops.filter(
      (o) => o.table === 'tasks' && o.op === 'insert'
    );
    expect(taskInserts).toHaveLength(2);
    expect(taskInserts[0].payload.task_id_text).not.toBe(
      taskInserts[1].payload.task_id_text
    );
  });

  it('requires a title and a description', async () => {
    const noTitle = await POST(request(formBody({ title: '   ' })));
    expect(noTitle.status).toBe(400);
    expect((await noTitle.json()).error).toBe('Title is required');

    const noDescription = await POST(request(formBody({ description: '' })));
    expect(noDescription.status).toBe(400);
    expect((await noDescription.json()).error).toBe('Description is required');

    expect(seed.tasks).toHaveLength(0);
  });

  it('rejects an unparseable body', async () => {
    const res = await POST(request('{ not json'));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });

  it('rejects an invalid due date', async () => {
    const res = await POST(request(formBody({ due_date: 'not-a-date' })));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Due date is invalid');
    expect(seed.tasks).toHaveLength(0);
  });

  it('rejects an unauthenticated request', async () => {
    currentStaff = null;

    const res = await POST(request(formBody()));

    expect(res.status).toBe(401);
    expect(seed.tasks).toHaveLength(0);
  });
});
