/**
 * Ruhvi GST & Accounts Computation Engine
 * Conforms to Indian GST Rules (Rule 46 Tax Invoice) & Jewelry HSN 7113 specifics.
 */

export const RUHVI_GST_CONFIG = {
  legalName: 'Ruhvi Jewels Private Limited',
  tradeName: 'Ruhvi Jewels',
  gstin: '19AAACR1234F1Z5',
  pan: 'AAACR1234F',
  state: 'West Bengal',
  stateCode: '19',
  address: 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal - 700091',
  phone: '+91 98765 43210',
  email: 'accounts@ruhvi.in',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  branch: 'Salt Lake Sector V, Kolkata',
  upiVpa: 'ruhvijewels@hdfcbank',
  defaultJewelryHsn: '7113',
  defaultJewelryGstRate: 3, // 3% GST (1.5% CGST + 1.5% SGST or 3% IGST)
};

export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  purity?: '22K' | '18K' | '14K' | '925 Silver' | 'Diamond' | 'Other';
  grossWeightGrams?: number;
  netWeightGrams?: number;
  quantity: number;
  unitPrice: number; // Metal rate or product base price
  makingCharges?: number;
  hallmarkingCharges?: number;
  discount?: number;
  taxableValue: number;
  gstRate: number; // default 3%
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface GSTInvoice {
  id: string;
  orderId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  docType: 'TAX_INVOICE' | 'PROFORMA' | 'DELIVERY_CHALLAN' | 'CREDIT_NOTE';
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerGstin?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState: string;
  customerStateCode: string;
  placeOfSupply: string;
  isInterState: boolean;
  items: InvoiceItem[];
  subtotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMethod: string;
  upiQrPayload: string;
  termsAndConditions?: string;
}

/**
 * Calculates line-item GST amounts depending on intra-state vs inter-state
 */
export function calculateItemGst(
  item: {
    quantity: number;
    unitPrice: number;
    makingCharges?: number;
    hallmarkingCharges?: number;
    discount?: number;
    gstRate?: number;
  },
  isInterState: boolean
) {
  const qty = Number(item.quantity) || 1;
  const rate = Number(item.unitPrice) || 0;
  const making = Number(item.makingCharges) || 0;
  const hallmark = Number(item.hallmarkingCharges) || 0;
  const disc = Number(item.discount) || 0;
  const gstRate = Number(
    item.gstRate ?? RUHVI_GST_CONFIG.defaultJewelryGstRate
  );

  const rawTaxable = qty * rate + making + hallmark - disc;
  const taxableValue = Math.max(0, Math.round(rawTaxable * 100) / 100);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = Math.round(((taxableValue * gstRate) / 100) * 100) / 100;
  } else {
    const halfRate = gstRate / 2;
    cgstAmount = Math.round(((taxableValue * halfRate) / 100) * 100) / 100;
    sgstAmount = Math.round(((taxableValue * halfRate) / 100) * 100) / 100;
  }

  const totalAmount =
    Math.round((taxableValue + cgstAmount + sgstAmount + igstAmount) * 100) /
    100;

  return {
    taxableValue,
    gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
  };
}

/**
 * Generates UPI Deep Link Payload for Instant QR scan & pay
 */
export function generateUpiPayload(amount: number, invoiceNum: string): string {
  const vpa = RUHVI_GST_CONFIG.upiVpa;
  const name = encodeURIComponent(RUHVI_GST_CONFIG.tradeName);
  const note = encodeURIComponent(`Invoice ${invoiceNum}`);
  return `upi://pay?pa=${vpa}&pn=${name}&am=${amount.toFixed(2)}&cu=INR&tn=${note}`;
}

/**
 * Converts numbers into Indian Currency words (e.g., Lakh, Crore)
 */
export function numberToIndianWords(num: number): string {
  const n = Math.round(num);
  if (n === 0) return 'Zero Rupees Only';

  const single = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(v: number): string {
    if (v < 20) return single[v];
    const t = Math.floor(v / 10);
    const s = v % 10;
    return `${tens[t]} ${single[s]}`.trim();
  }

  function convertThreeDigits(v: number): string {
    const h = Math.floor(v / 100);
    const rem = v % 100;
    let res = '';
    if (h > 0) res += `${single[h]} Hundred `;
    if (rem > 0) res += convertTwoDigits(rem);
    return res.trim();
  }

  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundreds = remainder;

  let words = '';
  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (hundreds > 0) words += convertThreeDigits(hundreds);

  return `${words.trim()} Rupees Only`;
}

/**
 * GSTR-1 JSON Generator conforming to gst.gov.in standard
 */
export function generateGstr1Json(
  invoices: GSTInvoice[],
  returnPeriod = '112026'
) {
  const b2bInvoices = invoices.filter(
    (inv) => !!inv.customerGstin && inv.customerGstin.trim().length === 15
  );
  const b2cInvoices = invoices.filter(
    (inv) => !inv.customerGstin || inv.customerGstin.trim().length !== 15
  );

  // Group B2B by recipient GSTIN
  const b2bMap: Record<string, any[]> = {};
  for (const inv of b2bInvoices) {
    const ctin = inv.customerGstin!.toUpperCase();
    if (!b2bMap[ctin]) b2bMap[ctin] = [];

    b2bMap[ctin].push({
      inum: inv.invoiceNumber,
      idt: inv.invoiceDate.split('T')[0],
      val: inv.grandTotal,
      pos: inv.customerStateCode,
      rchrg: 'N',
      inv_typ: 'R',
      itms: inv.items.map((it, idx) => ({
        num: idx + 1,
        itm_det: {
          txval: it.taxableValue,
          rt: it.gstRate,
          camt: it.cgstAmount,
          samt: it.sgstAmount,
          iamt: it.igstAmount,
          csamt: 0,
        },
      })),
    });
  }

  const b2bPayload = Object.keys(b2bMap).map((ctin) => ({
    ctin,
    inv: b2bMap[ctin],
  }));

  // Group B2CS by state & rate
  const b2csMap: Record<
    string,
    {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      rt: number;
      pos: string;
    }
  > = {};
  for (const inv of b2cInvoices) {
    const pos = inv.customerStateCode || RUHVI_GST_CONFIG.stateCode;
    const rate = RUHVI_GST_CONFIG.defaultJewelryGstRate;
    const key = `${pos}_${rate}`;

    if (!b2csMap[key]) {
      b2csMap[key] = { txval: 0, iamt: 0, camt: 0, samt: 0, rt: rate, pos };
    }
    b2csMap[key].txval += inv.subtotalTaxable;
    b2csMap[key].iamt += inv.totalIgst;
    b2csMap[key].camt += inv.totalCgst;
    b2csMap[key].samt += inv.totalSgst;
  }

  const b2csPayload = Object.keys(b2csMap).map((k) => ({
    sply_ty: b2csMap[k].pos === RUHVI_GST_CONFIG.stateCode ? 'INTRA' : 'INTER',
    pos: b2csMap[k].pos,
    typ: 'OE',
    txval: Math.round(b2csMap[k].txval * 100) / 100,
    rt: b2csMap[k].rt,
    iamt: Math.round(b2csMap[k].iamt * 100) / 100,
    camt: Math.round(b2csMap[k].camt * 100) / 100,
    samt: Math.round(b2csMap[k].samt * 100) / 100,
    csamt: 0,
  }));

  // HSN Summary
  const hsnSummary = [
    {
      num: 1,
      hsn_sc: RUHVI_GST_CONFIG.defaultJewelryHsn,
      desc: 'Articles of Jewellery of Precious Metal (Gold/Silver)',
      uqc: 'GMS',
      qty: invoices.reduce(
        (acc, inv) =>
          acc +
          inv.items.reduce(
            (s, it) => s + (it.netWeightGrams || it.quantity),
            0
          ),
        0
      ),
      val:
        Math.round(
          invoices.reduce((acc, inv) => acc + inv.grandTotal, 0) * 100
        ) / 100,
      txval:
        Math.round(
          invoices.reduce((acc, inv) => acc + inv.subtotalTaxable, 0) * 100
        ) / 100,
      iamt:
        Math.round(
          invoices.reduce((acc, inv) => acc + inv.totalIgst, 0) * 100
        ) / 100,
      camt:
        Math.round(
          invoices.reduce((acc, inv) => acc + inv.totalCgst, 0) * 100
        ) / 100,
      samt:
        Math.round(
          invoices.reduce((acc, inv) => acc + inv.totalSgst, 0) * 100
        ) / 100,
      csamt: 0,
    },
  ];

  return {
    gstin: RUHVI_GST_CONFIG.gstin,
    fp: returnPeriod,
    version: 'GSTR1_V2.0',
    hash: 'hash',
    b2b: b2bPayload,
    b2cs: b2csPayload,
    hsn: { data: hsnSummary },
  };
}
