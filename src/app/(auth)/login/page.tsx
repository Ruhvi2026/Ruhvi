import { headers } from 'next/headers';
import AdminLogin from './AdminLogin';
import CustomerLogin from './CustomerLogin';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isAdminHost =
    host === 'admin.ruhvi.in' || host.startsWith('admin.localhost');
  const isOperationsHost =
    host === 'operation.ruhvi.in' || host.startsWith('operation.localhost');
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
    let defaultRedirect = '/admin/dashboard';
    if (isOperationsHost) defaultRedirect = '/operations/dashboard';
    else if (isMarketingHost) defaultRedirect = '/marketing/dashboard';
    else if (isOrdersHost) defaultRedirect = '/portal-orders/dashboard';
    else if (isSupportHost) defaultRedirect = '/support/dashboard';

    return <AdminLogin defaultRedirect={defaultRedirect} />;
  }

  return <CustomerLogin />;
}
