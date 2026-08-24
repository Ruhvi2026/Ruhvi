import { createClient } from '@supabase/supabase-js';

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
