import { createClient } from '@supabase/supabase-js';

// Mapping from role_permissions action suffixes to TOOL_PERMISSION_MAP action levels
const ACTION_TO_SCOPE: Record<string, 'read' | 'write'> = {
  view: 'read',
  read: 'read',
  list: 'read',
  create: 'write',
  edit: 'write',
  update: 'write',
  delete: 'write',
  publish: 'write',
  adjust: 'write',
  transfer: 'write',
  receive: 'write',
  damage: 'write',
  export: 'write',
  reply: 'write',
  assign: 'write',
  close: 'write',
  escalate: 'write',
  cancel: 'write',
  approve: 'write',
  process: 'write',
  manage: 'write',
  admin: 'write',
};

const ALL_MODULES = [
  'orders',
  'products',
  'category',
  'inventory',
  'customer',
  'wallet',
  'rewards_coin',
  'payment',
  'whatsapp',
  'push_notifications',
  'blog',
  'offers',
  'marketing_campaign',
  'website_management',
  'analytics',
  'user_management',
  'team_management',
  'role_management',
  'mcp_tools',
  'support_ticket',
  'coupons',
];

export function buildScopesFromPermissions(
  permissions: string[]
): string[] {
  const scopes = new Set<string>();

  for (const perm of permissions) {
    if (perm === '*') {
      ALL_MODULES.forEach((m) => {
        scopes.add(`${m}:read`);
        scopes.add(`${m}:write`);
      });
      continue;
    }

    const [mod, action] = perm.split('.');
    if (!mod || !action) continue;

    if (action === '*') {
      scopes.add(`${mod}:read`);
      scopes.add(`${mod}:write`);
      continue;
    }

    const scopeAction = ACTION_TO_SCOPE[action];
    if (scopeAction) {
      scopes.add(`${mod}:${scopeAction}`);
    }
  }

  return Array.from(scopes);
}

export async function getUserScopes(userId: string): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, role_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return [];
    }

    if (user.role === 'super_admin' || user.role === 'SUPER_ADMIN') {
      return buildScopesFromPermissions(['*']);
    }

    let roleId = user.role_id;

    if (!roleId) {
      const roleName = String(user.role || '').toUpperCase();
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .maybeSingle();

      if (!roleRow) {
        return [];
      }

      roleId = roleRow.id;
    }

    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleId);

    if (!permissions) {
      return [];
    }

    return buildScopesFromPermissions(
      permissions.map((p: any) => p.permission)
    );
  } catch {
    return [];
  }
}

// We need a server-side client for API routes or server actions
// to check permissions securely against the database.
export async function hasPermission(
  userId: string,
  requiredPermission: string,
  supabaseClient?: any
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase =
    supabaseClient ||
    createClient(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    });

  try {
    // 1. Get the user's role_id and standard role fallback
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, role_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return false;
    }

    // If super_admin, they have global access
    if (user.role === 'super_admin' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    let roleId = user.role_id;

    if (!roleId) {
      const roleName = String(user.role || '').toUpperCase();
      const { data: roleRow, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .maybeSingle();

      if (roleError || !roleRow) {
        return false;
      }

      roleId = roleRow.id;
    }

    // 2. Check the role_permissions table
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleId);

    if (permError || !permissions) {
      return false;
    }

    // 3. Check for specific permission or wildcard '*'
    const hasPerm = permissions.some(
      (p: { permission: string }) =>
        p.permission === '*' || p.permission === requiredPermission
    );

    // Also support module-level wildcards like `products.*`
    const [moduleName] = requiredPermission.split('.');
    const hasModuleWildcard = permissions.some(
      (p: { permission: string }) => p.permission === `${moduleName}.*`
    );

    return hasPerm || hasModuleWildcard;
  } catch (err) {
    console.error('Error in hasPermission:', err);
    return false;
  }
}
