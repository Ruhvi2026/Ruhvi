import jsPDF from 'jspdf';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

export interface PdfLineItem {
  sl: number;
  description: string;
  hsn: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  makingCharges: number;
  taxableValue: number;
  gstRate: number;
  totalAmount: number;
}

export interface RuhviPdfData {
  docType:
    | 'TAX_INVOICE'
    | 'PROFORMA'
    | 'DELIVERY_CHALLAN'
    | 'CREDIT_NOTE'
    | 'QUOTATION'
    | 'BILL_OF_SUPPLY';
  docNumber: string;
  docDate: string;
  validUntil?: string;
  customerName: string;
  customerAddress: string;
  customerGstin?: string;
  customerPhone?: string;
  placeOfSupply: string;
  isInterState: boolean;
  currencySymbol: string;
  currencyCode: string;
  items: PdfLineItem[];
  subtotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  amountInWords: string;
  notes?: string;
}

function getDocTitle(docType: RuhviPdfData['docType']): string {
  switch (docType) {
    case 'TAX_INVOICE':
      return 'TAX INVOICE (RULE 46 - GST)';
    case 'PROFORMA':
      return 'PROFORMA INVOICE';
    case 'DELIVERY_CHALLAN':
      return 'DELIVERY CHALLAN (RULE 55)';
    case 'CREDIT_NOTE':
      return 'CREDIT NOTE (SEC 34)';
    case 'QUOTATION':
      return 'PRICE ESTIMATE / QUOTATION';
    case 'BILL_OF_SUPPLY':
      return 'BILL OF SUPPLY (SEC 31(3)(c))';
    default:
      return 'TAX INVOICE';
  }
}

export function generateRuhviPdf(data: RuhviPdfData, filename?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const s = data.currencySymbol === '₹' ? 'Rs.' : data.currencySymbol;
  const isBillOfSupply = data.docType === 'BILL_OF_SUPPLY';
  const isQuotation = data.docType === 'QUOTATION';

  // Background subtle border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, 194, 281);

  // Top Accent Banner (Luxury Gold)
  doc.setFillColor(180, 83, 9); // Gold amber-700
  doc.rect(8, 8, 194, 3, 'F');

  // Title Banner
  doc.setFillColor(248, 250, 252);
  doc.rect(12, 14, 186, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14); // Amber-800
  doc.text(getDocTitle(data.docType), 105, 20, { align: 'center' });

  // Company Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(RUHVI_GST_CONFIG.legalName, 14, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('BIS Hallmarked Fine Gold & Diamond Jewellery', 14, 35);
  doc.text(RUHVI_GST_CONFIG.address, 14, 39);
  doc.text(
    `GSTIN: ${RUHVI_GST_CONFIG.gstin}   |   PAN: ${RUHVI_GST_CONFIG.pan}`,
    14,
    43
  );
  doc.text(
    `Email: ${RUHVI_GST_CONFIG.email}   |   Phone: ${RUHVI_GST_CONFIG.phone}`,
    14,
    47
  );

  // Invoice / Document Meta (Right Box)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(125, 26, 73, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Doc No: ${data.docNumber}`, 128, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date of Issue: ${data.docDate}`, 128, 36);

  if (isQuotation && data.validUntil) {
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valid Until: ${data.validUntil}`, 128, 41);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
  } else {
    doc.text(`Place of Supply: ${data.placeOfSupply}`, 128, 41);
  }

  doc.text(
    isBillOfSupply
      ? 'Tax Type: Exempt / Composition'
      : data.isInterState
        ? 'Supply: Inter-State (IGST 3%)'
        : 'Supply: Intra-State (CGST+SGST)',
    128,
    46
  );

  // Customer (Bill To) Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, 53, 186, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text('BILLED TO / RECIPIENT DETAILS:', 15, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.customerName || 'Valued Customer', 15, 63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(data.customerAddress || 'Customer Address', 15, 67);

  const phoneGstinText = `Phone: ${data.customerPhone || 'N/A'}    |    GSTIN: ${
    data.customerGstin || 'URP (Unregistered Person)'
  }`;
  doc.text(phoneGstinText, 15, 71);

  // Table Header
  let y = 78;
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(12, y, 186, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 14, y + 5);
  doc.text('Item Description & Design', 22, y + 5);
  doc.text('HSN', 80, y + 5);
  doc.text('Purity', 93, y + 5);
  doc.text('Gross', 106, y + 5);
  doc.text('Net(g)', 118, y + 5);
  doc.text(`Rate/${s}`, 130, y + 5);
  doc.text('Making', 148, y + 5);
  doc.text('Taxable', 165, y + 5);
  doc.text('Total', 183, y + 5);

  y += 7;

  // Table Body Rows
  data.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, 186, 7, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(12, y + 7, 198, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    doc.text(String(index + 1), 14, y + 5);

    // Truncate description if too long
    const desc =
      item.description.length > 34
        ? item.description.substring(0, 32) + '..'
        : item.description;
    doc.text(desc, 22, y + 5);

    doc.text(item.hsn || '7113', 80, y + 5);
    doc.text(item.purity || '22K', 93, y + 5);
    doc.text(item.grossWeight.toFixed(2), 106, y + 5);
    doc.text(item.netWeight.toFixed(2), 118, y + 5);
    doc.text(Math.round(item.ratePerGram).toLocaleString('en-IN'), 130, y + 5);
    doc.text(
      Math.round(item.makingCharges).toLocaleString('en-IN'),
      148,
      y + 5
    );
    doc.text(Math.round(item.taxableValue).toLocaleString('en-IN'), 165, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text(Math.round(item.totalAmount).toLocaleString('en-IN'), 183, y + 5);

    y += 7;
  });

  // Space before Totals
  y += 4;

  // Amount in words box (Left)
  doc.setFillColor(254, 252, 232); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(12, y, 110, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14);
  doc.text('TOTAL IN WORDS:', 15, y + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  const splitWords = doc.splitTextToSize(
    data.amountInWords || 'Zero Only',
    104
  );
  doc.text(splitWords, 15, y + 10);

  // Totals Box (Right)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(128, y, 70, 32, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal (Taxable):', 131, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${s} ${data.subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    195,
    y + 5,
    { align: 'right' }
  );

  if (isBillOfSupply) {
    doc.setFont('helvetica', 'normal');
    doc.text('GST (Bill of Supply):', 131, y + 10);
    doc.text('Exempt (0.00)', 195, y + 10, { align: 'right' });
  } else if (!data.isInterState) {
    doc.setFont('helvetica', 'normal');
    doc.text('CGST (1.5%):', 131, y + 10);
    doc.text(
      `${s} ${data.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      195,
      y + 10,
      { align: 'right' }
    );

    doc.text('SGST (1.5%):', 131, y + 15);
    doc.text(
      `${s} ${data.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      195,
      y + 15,
      { align: 'right' }
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('IGST (3.0%):', 131, y + 10);
    doc.text(
      `${s} ${data.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      195,
      y + 10,
      { align: 'right' }
    );
  }

  // Grand Total Line
  doc.setFillColor(15, 23, 42);
  doc.rect(128, y + 23, 70, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36); // Amber-400
  doc.text('GRAND TOTAL:', 131, y + 29);
  doc.text(
    `${s} ${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    195,
    y + 29,
    { align: 'right' }
  );

  y += 38;

  // Notes if any
  if (data.notes) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, y, 186, 12, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CONSULTATION / ESTIMATE TERMS:', 15, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(data.notes, 15, y + 8);
    y += 15;
  }

  // Bank Details (Bottom Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, 110, 25, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('BANK DETAILS FOR RTGS / NEFT / IMPS:', 15, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${RUHVI_GST_CONFIG.bankName}`, 15, y + 9);
  doc.text(`Account No: ${RUHVI_GST_CONFIG.accountNumber}`, 15, y + 13);
  doc.text(`IFSC Code: ${RUHVI_GST_CONFIG.ifscCode}`, 15, y + 17);
  doc.text(`UPI VPA: ${RUHVI_GST_CONFIG.upiVpa}`, 15, y + 21);

  // Signatory (Bottom Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${RUHVI_GST_CONFIG.legalName}`, 190, y + 5, { align: 'right' });

  doc.line(145, y + 20, 195, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory', 170, y + 24, { align: 'center' });

  // Compliance Badges (Bottom Line)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '✓ Certified BIS Hallmark Purity   •   ✓ GST Rule 46 Registered   •   ✓ Computer-Generated Document',
    105,
    283,
    { align: 'center' }
  );

  // Download PDF file
  const outFilename =
    filename ||
    `${data.docNumber.replace(/[^a-zA-Z0-9-]/g, '_')}_${data.docDate}.pdf`;
  doc.save(outFilename);
}
