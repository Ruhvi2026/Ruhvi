import { headers } from 'next/headers';
import AdminLogin from './AdminLogin';
import CustomerLogin from './CustomerLogin';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isAdminHost =
    host === 'admin.ruhvi.in' || host.startsWith('admin.localhost');
  const isOperationsHost =
    host === 'operations.ruhvi.in' || host.startsWith('operations.localhost');
  const isMarketingHost =
    host === 'marketing.ruhvi.in' || host.startsWith('marketing.localhost');
  const isOrdersHost =
    host === 'orders.ruhvi.in' || host.startsWith('orders.localhost');
  const isSupportHost =
    host === 'support.ruhvi.in' || host.startsWith('support.localhost');

  const isSystemSubdomain =
    isAdminHost ||
    isOperationsHost ||
    isMarketingHost ||
    isOrdersHost ||
    isSupportHost;

  if (isSystemSubdomain) {
    return <AdminLogin />;
  }

  return <CustomerLogin />;
}
