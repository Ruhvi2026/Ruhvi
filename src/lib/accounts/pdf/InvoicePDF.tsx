'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
    paddingBottom: 10,
    marginBottom: 12,
  },
  companyBlock: { flex: 1 },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  companyTagline: { fontSize: 7, color: '#78350f', marginTop: 2 },
  companyDetails: {
    fontSize: 7,
    color: '#475569',
    marginTop: 6,
    lineHeight: 1.5,
  },
  invoiceBadge: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  invoiceNum: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 4,
  },
  invoiceDate: { fontSize: 7, color: '#64748b', marginTop: 2 },
  // Party Grid
  partyGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
  },
  partyName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  partyDetail: { fontSize: 7, color: '#475569', marginTop: 2, lineHeight: 1.4 },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 5,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#f1f5f9',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 5,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#fffbeb',
  },
  tableText: { fontSize: 7.5, color: '#334155' },
  // Column widths
  colSl: { width: '4%' },
  colDesc: { width: '28%' },
  colHsn: { width: '8%' },
  colPurity: { width: '7%' },
  colGw: { width: '7%' },
  colNw: { width: '7%' },
  colRate: { width: '9%' },
  colMaking: { width: '9%' },
  colTaxable: { width: '10%' },
  colGst: { width: '6%' },
  colTotal: { width: '10%' },
  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsBox: {
    width: 200,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5 8',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  totalsLabel: { fontSize: 7, color: '#475569' },
  totalsValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '7 8',
    backgroundColor: '#1e293b',
  },
  grandTotalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#fbbf24',
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fbbf24',
  },
  // Words
  amountWords: {
    marginTop: 8,
    padding: '5 8',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 3,
  },
  amountWordsLabel: {
    fontSize: 6.5,
    color: '#78350f',
    fontFamily: 'Helvetica-Bold',
  },
  amountWordsText: {
    fontSize: 7,
    color: '#92400e',
    marginTop: 2,
    fontFamily: 'Helvetica-Oblique',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bankBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
    marginRight: 8,
  },
  bankLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  bankRow: { flexDirection: 'row', marginTop: 2 },
  bankKey: { fontSize: 6.5, color: '#64748b', width: 60 },
  bankVal: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  signBox: {
    width: 140,
    alignItems: 'flex-end',
  },
  signLabel: { fontSize: 7, color: '#475569' },
  signLine: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    width: 120,
    paddingTop: 3,
    alignItems: 'center',
  },
  signText: { fontSize: 6.5, color: '#64748b' },
  // Compliance bar
  complianceBar: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  compliancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  complianceText: {
    fontSize: 6,
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
  },
  // Quotation specific
  validityBar: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 4,
    padding: '6 10',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityText: { fontSize: 7, color: '#92400e' },
  validityBold: { fontFamily: 'Helvetica-Bold' },
  // Bill of Supply notice
  compositionBar: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 4,
    padding: '6 10',
    marginBottom: 10,
  },
  compositionText: { fontSize: 7, color: '#0c4a6e' },
  compositionBold: { fontFamily: 'Helvetica-Bold' },
});

// ─── Types ────────────────────────────────────────────────────────────────────
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
  validUntil?: string; // for Quotation
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

// ─── Doc Type Label ───────────────────────────────────────────────────────────
function docLabel(docType: RuhviPdfData['docType']): string {
  const map: Record<string, string> = {
    TAX_INVOICE: 'Tax Invoice',
    PROFORMA: 'Proforma Invoice',
    DELIVERY_CHALLAN: 'Delivery Challan',
    CREDIT_NOTE: 'Credit Note',
    QUOTATION: 'Quotation / Estimate',
    BILL_OF_SUPPLY: 'Bill of Supply',
  };
  return map[docType] || 'Tax Invoice';
}

// ─── PDF Document Component ───────────────────────────────────────────────────
export function RuhviInvoicePDF({ data }: { data: RuhviPdfData }) {
  const s = data.currencySymbol;
  const isBillOfSupply = data.docType === 'BILL_OF_SUPPLY';
  const isQuotation = data.docType === 'QUOTATION';

  const gstLabel = data.isInterState
    ? `IGST ${data.items[0]?.gstRate ?? 3}%`
    : `CGST ${(data.items[0]?.gstRate ?? 3) / 2}% + SGST ${(data.items[0]?.gstRate ?? 3) / 2}%`;

  return (
    <Document
      title={`${docLabel(data.docType)} - ${data.docNumber}`}
      author="Ruhvi Jewels"
      subject="GST Compliant Invoice"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{RUHVI_GST_CONFIG.legalName}</Text>
            <Text style={styles.companyTagline}>
              BIS Hallmarked Fine Jewellery | Est. 2003
            </Text>
            <Text style={styles.companyDetails}>
              {RUHVI_GST_CONFIG.address}
              {'\n'}
              GSTIN: {RUHVI_GST_CONFIG.gstin}
              {'   '}PAN: {RUHVI_GST_CONFIG.pan}
              {'\n'}
              Email: {RUHVI_GST_CONFIG.email}
              {'   '}Phone: {RUHVI_GST_CONFIG.phone}
            </Text>
          </View>
          <View style={styles.invoiceBadge}>
            <Text style={styles.invoiceTitle}>{docLabel(data.docType)}</Text>
            <Text style={styles.invoiceNum}># {data.docNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {data.docDate}</Text>
            {isQuotation && data.validUntil && (
              <Text style={[styles.invoiceDate, { color: '#b45309' }]}>
                Valid Until: {data.validUntil}
              </Text>
            )}
            <Text style={[styles.invoiceDate, { marginTop: 4 }]}>
              Place of Supply: {data.placeOfSupply}
            </Text>
            {!isBillOfSupply && (
              <Text style={[styles.invoiceDate, { color: '#1d4ed8' }]}>
                {data.isInterState
                  ? 'Inter-State Supply (IGST)'
                  : 'Intra-State Supply (CGST+SGST)'}
              </Text>
            )}
          </View>
        </View>

        {/* ── Composition / Bill of Supply Notice ── */}
        {isBillOfSupply && (
          <View style={styles.compositionBar}>
            <Text style={[styles.compositionText, styles.compositionBold]}>
              BILL OF SUPPLY (Sec. 31(3)(c) CGST Act)
            </Text>
            <Text style={[styles.compositionText, { marginTop: 2 }]}>
              This document is issued under the provisions of the GST Act for
              supply of exempted goods/services. No GST is charged.
            </Text>
          </View>
        )}

        {/* ── Quotation Validity Notice ── */}
        {isQuotation && (
          <View style={styles.validityBar}>
            <Text style={styles.validityText}>
              <Text style={styles.validityBold}>QUOTATION / ESTIMATE</Text> —
              This is not a tax invoice. Subject to change without notice.
            </Text>
            {data.validUntil && (
              <Text style={[styles.validityText, styles.validityBold]}>
                Offer valid until {data.validUntil}
              </Text>
            )}
          </View>
        )}

        {/* ── Party Grid ── */}
        <View style={styles.partyGrid}>
          {/* Bill To */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To / Ship To</Text>
            <Text style={styles.partyName}>{data.customerName}</Text>
            <Text style={styles.partyDetail}>{data.customerAddress}</Text>
            {data.customerPhone && (
              <Text style={styles.partyDetail}>
                Phone: {data.customerPhone}
              </Text>
            )}
            {data.customerGstin && (
              <Text
                style={[
                  styles.partyDetail,
                  { fontFamily: 'Helvetica-Bold', color: '#1e293b' },
                ]}
              >
                GSTIN: {data.customerGstin}
              </Text>
            )}
            {!data.customerGstin && (
              <Text style={[styles.partyDetail, { color: '#94a3b8' }]}>
                GSTIN: URP (Unregistered Person)
              </Text>
            )}
          </View>
          {/* Seller */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Supplied By</Text>
            <Text style={styles.partyName}>{RUHVI_GST_CONFIG.legalName}</Text>
            <Text style={styles.partyDetail}>{RUHVI_GST_CONFIG.address}</Text>
            <Text
              style={[
                styles.partyDetail,
                { fontFamily: 'Helvetica-Bold', color: '#1e293b' },
              ]}
            >
              GSTIN: {RUHVI_GST_CONFIG.gstin}
            </Text>
            <Text style={styles.partyDetail}>State Code: 19 (West Bengal)</Text>
            <Text style={styles.partyDetail}>
              HSN Chapter: 71 — Precious Metals & Jewellery
            </Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colSl]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colHsn]}>HSN</Text>
            <Text style={[styles.tableHeaderText, styles.colPurity]}>
              Purity
            </Text>
            <Text style={[styles.tableHeaderText, styles.colGw]}>Gr.Wt(g)</Text>
            <Text style={[styles.tableHeaderText, styles.colNw]}>
              Net.Wt(g)
            </Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>
              Rate/{s}/g
            </Text>
            <Text style={[styles.tableHeaderText, styles.colMaking]}>
              Making
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTaxable]}>
              Taxable
            </Text>
            {!isBillOfSupply && (
              <Text style={[styles.tableHeaderText, styles.colGst]}>GST%</Text>
            )}
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>

          {/* Table Rows */}
          {data.items.map((item, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableText, styles.colSl]}>{item.sl}</Text>
              <Text style={[styles.tableText, styles.colDesc]}>
                {item.description}
              </Text>
              <Text
                style={[
                  styles.tableText,
                  styles.colHsn,
                  { fontFamily: 'Helvetica-Bold' },
                ]}
              >
                {item.hsn}
              </Text>
              <Text style={[styles.tableText, styles.colPurity]}>
                {item.purity}
              </Text>
              <Text style={[styles.tableText, styles.colGw]}>
                {item.grossWeight.toFixed(2)}
              </Text>
              <Text style={[styles.tableText, styles.colNw]}>
                {item.netWeight.toFixed(2)}
              </Text>
              <Text style={[styles.tableText, styles.colRate]}>
                {s}
                {item.ratePerGram.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.tableText, styles.colMaking]}>
                {s}
                {item.makingCharges.toLocaleString('en-IN')}
              </Text>
              <Text
                style={[
                  styles.tableText,
                  styles.colTaxable,
                  { fontFamily: 'Helvetica-Bold' },
                ]}
              >
                {s}
                {item.taxableValue.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </Text>
              {!isBillOfSupply && (
                <Text style={[styles.tableText, styles.colGst]}>
                  {item.gstRate}%
                </Text>
              )}
              <Text
                style={[
                  styles.tableText,
                  styles.colTotal,
                  { fontFamily: 'Helvetica-Bold', color: '#92400e' },
                ]}
              >
                {s}
                {item.totalAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            {!isBillOfSupply && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal (Taxable):</Text>
                  <Text style={styles.totalsValue}>
                    {s}
                    {data.subtotalTaxable.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                {data.isInterState ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      IGST ({data.items[0]?.gstRate ?? 3}%):
                    </Text>
                    <Text style={styles.totalsValue}>
                      {s}
                      {data.totalIgst.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>
                        CGST ({(data.items[0]?.gstRate ?? 3) / 2}%):
                      </Text>
                      <Text style={styles.totalsValue}>
                        {s}
                        {data.totalCgst.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>
                        SGST ({(data.items[0]?.gstRate ?? 3) / 2}%):
                      </Text>
                      <Text style={styles.totalsValue}>
                        {s}
                        {data.totalSgst.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}
            {isBillOfSupply && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Net Amount (No GST):</Text>
                <Text style={styles.totalsValue}>
                  {s}
                  {data.subtotalTaxable.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
              <Text style={styles.grandTotalValue}>
                {s}
                {data.grandTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount in Words */}
        <View style={styles.amountWords}>
          <Text style={styles.amountWordsLabel}>Amount in Words:</Text>
          <Text style={styles.amountWordsText}>{data.amountInWords}</Text>
        </View>

        {/* Notes / Quotation Special Terms */}
        {data.notes && (
          <View
            style={{
              marginTop: 8,
              padding: '5 8',
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 3,
            }}
          >
            <Text
              style={{
                fontSize: 6.5,
                color: '#475569',
                fontFamily: 'Helvetica-Bold',
                marginBottom: 2,
              }}
            >
              Special Notes / Terms:
            </Text>
            <Text style={{ fontSize: 7, color: '#334155', lineHeight: 1.4 }}>
              {data.notes}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Bank Details */}
          <View style={styles.bankBox}>
            <Text style={styles.bankLabel}>Bank Details for NEFT / RTGS</Text>
            <View style={styles.bankRow}>
              <Text style={styles.bankKey}>Bank:</Text>
              <Text style={styles.bankVal}>{RUHVI_GST_CONFIG.bankName}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankKey}>Account No:</Text>
              <Text style={styles.bankVal}>
                {RUHVI_GST_CONFIG.accountNumber}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankKey}>IFSC:</Text>
              <Text style={styles.bankVal}>{RUHVI_GST_CONFIG.ifscCode}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankKey}>Branch:</Text>
              <Text style={styles.bankVal}>{RUHVI_GST_CONFIG.branch}</Text>
            </View>
            <View style={[styles.bankRow, { marginTop: 4 }]}>
              <Text style={styles.bankKey}>UPI VPA:</Text>
              <Text style={[styles.bankVal, { color: '#1d4ed8' }]}>
                {RUHVI_GST_CONFIG.upiVpa}
              </Text>
            </View>
          </View>
          {/* Signatory */}
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>
              For {RUHVI_GST_CONFIG.legalName}
            </Text>
            <View style={styles.signLine}>
              <Text style={styles.signText}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        {/* Compliance Pills */}
        <View style={styles.complianceBar}>
          <View style={styles.compliancePill}>
            <Text style={styles.complianceText}>✓ BIS Hallmark Certified</Text>
          </View>
          <View style={styles.compliancePill}>
            <Text style={styles.complianceText}>✓ GST Rule 46 Compliant</Text>
          </View>
          <View style={styles.compliancePill}>
            <Text style={styles.complianceText}>✓ HSN Chapter 71</Text>
          </View>
          <View
            style={[
              styles.compliancePill,
              { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
            ]}
          >
            <Text style={[styles.complianceText, { color: '#1e40af' }]}>
              Computer Generated — No Signature Required
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
