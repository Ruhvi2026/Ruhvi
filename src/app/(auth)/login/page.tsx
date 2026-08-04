import { headers } from 'next/headers';
import AdminLogin from './AdminLogin';
import CustomerLogin from './CustomerLogin';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isAdminHost = host === 'admin.ruhvi.in' || host.startsWith('admin.localhost');

  if (isAdminHost) {
    return <AdminLogin />;
  }

  return <CustomerLogin />;
}
