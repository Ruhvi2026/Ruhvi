import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('sb-access-token')?.value ||
      cookieStore.get('supabase-auth-token')?.value;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'customers';
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let exportData: any[] = [];
    let filename = `${type}-export-${new Date().toISOString().split('T')[0]}`;

    if (type === 'customers') {
      let query = supabase
        .from('users')
        .select(
          `
          id,
          full_name,
          email,
          phone,
          role,
          wallet_balance,
          created_at
        `
        )
        .order('created_at', { ascending: false });

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      exportData = (data || []).map((u: any) => ({
        'Customer ID': u.id,
        'Full Name': u.full_name || 'N/A',
        'Email Address': u.email || 'N/A',
        'Phone Number': u.phone || 'N/A',
        'Account Role': u.role || 'customer',
        'Wallet Balance (INR)': u.wallet_balance || 0,
        'Registered Date': u.created_at
          ? new Date(u.created_at).toLocaleString('en-IN')
          : 'N/A',
      }));
    } else if (type === 'inventory') {
      let query = supabase
        .from('products')
        .select(
          `
          id,
          title,
          sku,
          price,
          compare_at_price,
          stock,
          low_stock_threshold,
          status,
          created_at,
          category:categories(name)
        `
        )
        .order('created_at', { ascending: false });

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      exportData = (data || []).map((p: any) => ({
        'Product ID': p.id,
        SKU: p.sku || 'N/A',
        'Product Title': p.title || 'Untitled',
        Category: p.category?.name || 'Uncategorized',
        'Selling Price (INR)': p.price || 0,
        'Compare Price (INR)': p.compare_at_price || 0,
        'Current Stock Quantity': p.stock ?? 0,
        'Low Stock Threshold': p.low_stock_threshold ?? 5,
        Status: p.status || 'draft',
        'Created Date': p.created_at
          ? new Date(p.created_at).toLocaleString('en-IN')
          : 'N/A',
      }));
    } else if (type === 'orders') {
      let query = supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          total_amount,
          subtotal,
          discount_amount,
          shipping_amount,
          tax_amount,
          status,
          payment_status,
          payment_method,
          created_at,
          user:users(full_name, email, phone)
        `
        )
        .order('created_at', { ascending: false });

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      exportData = (data || []).map((o: any) => ({
        'Order ID': o.id,
        'Order Number': o.order_number || o.id,
        'Customer Name': o.user?.full_name || 'Guest',
        'Customer Email': o.user?.email || 'N/A',
        'Customer Phone': o.user?.phone || 'N/A',
        'Order Status': o.status || 'pending',
        'Payment Status': o.payment_status || 'pending',
        'Payment Method': o.payment_method || 'COD',
        'Subtotal (INR)': o.subtotal || 0,
        'Discount (INR)': o.discount_amount || 0,
        'Shipping (INR)': o.shipping_amount || 0,
        'Tax (INR)': o.tax_amount || 0,
        'Total Amount (INR)': o.total_amount || 0,
        'Order Placed At': o.created_at
          ? new Date(o.created_at).toLocaleString('en-IN')
          : 'N/A',
      }));
    } else {
      return NextResponse.json(
        { error: 'Invalid export type' },
        { status: 400 }
      );
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    const csvContent = convertToCSV(exportData);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json(
      { error: err.message || 'Export failed' },
      { status: 500 }
    );
  }
}
