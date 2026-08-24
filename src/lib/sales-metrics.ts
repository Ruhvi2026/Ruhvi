/**
 * Shared sales-metric computation for the admin dashboard.
 *
 * Both src/app/admin/dashboard/page.tsx (Overview tab) and
 * src/app/admin/dashboard/SalesDashboard.tsx (Sales tab) fetch the same
 * orders/order_items data and render the same KPIs. Keeping the aggregation
 * in one place prevents the two views from silently drifting (e.g. if the
 * cancelled status value or the `total` field name changes).
 */

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  todayRevenue: number;
  aov: number;
  cancelledOrders: number;
  cancelledRevenue: number;
  salesChartData: { date: string; Revenue: number; Orders: number }[];
  topProductsData: { name: string; value: number }[];
  earningsByCategoryData: { name: string; value: number }[];
}

export function computeSalesMetrics(params: {
  allOrdersMonth: { total: number | string; status?: string | null; created_at?: string }[] | null;
  todayOrders: { total: number | string }[] | null;
  orderItems: any[] | null;
}): SalesMetrics {
  const { allOrdersMonth, todayOrders, orderItems } = params;

  const totalRevenue = (allOrdersMonth || []).reduce(
    (s, o) => s + Number(o.total),
    0
  );
  const totalOrders = (allOrdersMonth || []).length;
  const todayRevenue = (todayOrders || []).reduce(
    (s, o) => s + Number(o.total),
    0
  );
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cancelledOrders = (allOrdersMonth || []).filter(
    (o) => o.status === 'cancelled'
  );
  const cancelledRevenue = cancelledOrders.reduce(
    (s, o) => s + Number(o.total),
    0
  );

  // Sales chart data
  const salesDataMap: Record<
    string,
    { date: string; Revenue: number; Orders: number }
  > = {};
  (allOrdersMonth || []).forEach((order) => {
    const dateStr = new Date(order.created_at || '').toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
    if (!salesDataMap[dateStr])
      salesDataMap[dateStr] = { date: dateStr, Revenue: 0, Orders: 0 };
    salesDataMap[dateStr].Revenue += Number(order.total);
    salesDataMap[dateStr].Orders += 1;
  });
  const salesChartData = Object.values(salesDataMap);

  // Top products + category earnings
  const productCounts: Record<string, { name: string; value: number }> = {};
  const categoryEarnings: Record<string, { name: string; value: number }> = {};
  (orderItems || []).forEach((item: any) => {
    const productObj = Array.isArray(item.product)
      ? item.product[0]
      : item.product;
    const productName = productObj?.name || 'Unknown';
    if (!productCounts[productName])
      productCounts[productName] = { name: productName, value: 0 };
    productCounts[productName].value += item.quantity;

    const catId = productObj?.category_id || 'other';
    if (!categoryEarnings[catId])
      categoryEarnings[catId] = { name: `Cat ${catId.slice(0, 6)}`, value: 0 };
    categoryEarnings[catId].value += item.price_at_purchase * item.quantity;
  });

  const topProductsData = Object.values(productCounts)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const earningsByCategoryData = Object.values(categoryEarnings)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    totalRevenue,
    totalOrders,
    todayRevenue,
    aov,
    cancelledOrders: cancelledOrders.length,
    cancelledRevenue,
    salesChartData,
    topProductsData,
    earningsByCategoryData,
  };
}
