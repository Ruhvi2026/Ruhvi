import { headers } from 'next/headers';
import { resolveHost } from '@/lib/middleware/resolve-host';
import AdminLogin from './AdminLogin';
import CustomerLogin from './CustomerLogin';

export default async function LoginPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const hostFlags = resolveHost(host);
  const {
    isOperationsHost,
    isMarketingHost,
    isOrdersHost,
    isSupportHost,
    isTechHost,
    isCoFounderHost,
    isAccountsHost,
    isAnyPortalHost,
  } = hostFlags;

  if (isAnyPortalHost) {
    let defaultRedirect = '/admin/dashboard';
    let portalTitle = 'Staff Login';
    let portalSubtitle = 'Ruhvi Operations & Administration Portal';

    if (isAccountsHost) {
      defaultRedirect = '/accounts/dashboard';
      portalTitle = 'Accounts & Finance Login';
      portalSubtitle = 'Ruhvi GST, Finance & Accounts Portal';
    } else if (isOperationsHost) {
      defaultRedirect = '/operations/dashboard';
      portalTitle = 'Operations Login';
      portalSubtitle = 'Ruhvi Inventory & Operations Portal';
    } else if (isMarketingHost) {
      defaultRedirect = '/marketing/dashboard';
      portalTitle = 'Marketing Login';
      portalSubtitle = 'Ruhvi Marketing & Growth Portal';
    } else if (isOrdersHost) {
      defaultRedirect = '/portal-orders/dashboard';
      portalTitle = 'Orders Portal Login';
      portalSubtitle = 'Ruhvi Order Processing & Logistics';
    } else if (isSupportHost) {
      defaultRedirect = '/support/dashboard';
      portalTitle = 'Customer Support Login';
      portalSubtitle = 'Ruhvi Helpdesk & Ticket Console';
    } else if (isTechHost) {
      defaultRedirect = '/tech/dashboard';
      portalTitle = 'Tech Portal Login';
      portalSubtitle = 'Ruhvi Tech & Developer Console';
    } else if (isCoFounderHost) {
      defaultRedirect = '/co-founder';
      portalTitle = 'AI Co-Founder Login';
      portalSubtitle = 'Ruhvi AI Executive Workspace';
    }

    return (
      <AdminLogin
        defaultRedirect={defaultRedirect}
        portalTitle={portalTitle}
        portalSubtitle={portalSubtitle}
      />
    );
  }

  return <CustomerLogin />;
}
