'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  TrendingUp,
  Building2,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

export default function IncomeTaxEstimatorPage() {
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [entityType, setEntityType] = useState<
    'CORPORATE' | 'PARTNERSHIP' | 'INDIVIDUAL'
  >('CORPORATE');
  const [regime, setRegime] = useState<'NEW_REGIME' | 'OLD_REGIME'>(
    'NEW_REGIME'
  );
  const [taxMethod, setTaxMethod] = useState<'REGULAR' | '44AD_PRESUMPTIVE'>(
    'REGULAR'
  );

  // Financial Inputs (in INR)
  const [grossTurnover, setGrossTurnover] = useState<number>(38500000); // 3.85 Cr
  const [digitalReceiptsPct, setDigitalReceiptsPct] = useState<number>(92); // 92% digital, 8% cash
  const [cogsExpenses, setCogsExpenses] = useState<number>(31200000); // Bullion + stones + making: 3.12 Cr
  const [operatingExpenses, setOperatingExpenses] = useState<number>(3600000); // Rent, salaries, marketing: 36L
  const [depreciation, setDepreciation] = useState<number>(450000); // 4.5L
  const [otherIncome, setOtherIncome] = useState<number>(120000); // Bank FD interest

  // Advance Tax Paid So Far
  const [advancePaidQ1, setAdvancePaidQ1] = useState<number>(150000);
  const [advancePaidQ2, setAdvancePaidQ2] = useState<number>(300000);
  const [advancePaidQ3, setAdvancePaidQ3] = useState<number>(350000);
  const [advancePaidQ4, setAdvancePaidQ4] = useState<number>(0);

  // Calculations
  const digitalTurnover = (grossTurnover * digitalReceiptsPct) / 100;
  const cashTurnover = grossTurnover - digitalTurnover;

  // Regular Net Profit
  const netAccountingProfit =
    grossTurnover +
    otherIncome -
    (cogsExpenses + operatingExpenses + depreciation);
  const netTaxableIncome = Math.max(0, netAccountingProfit);

  // Section 44AD Presumptive Profit (6% on digital, 8% on cash)
  const presumptiveProfit = Math.round(
    digitalTurnover * 0.06 + cashTurnover * 0.08
  );

  // Effective Taxable Base based on method
  const effectiveTaxableIncome =
    taxMethod === '44AD_PRESUMPTIVE' ? presumptiveProfit : netTaxableIncome;

  // Tax Calculation based on Entity Type
  let baseTax = 0;
  let cess = 0;
  let totalTaxLiability = 0;

  if (entityType === 'CORPORATE') {
    // Domestic company opting for Sec 115BAA: 22% base + 10% surcharge + 4% cess = 25.17%
    baseTax = effectiveTaxableIncome * 0.22;
    const surcharge = baseTax * 0.1;
    cess = (baseTax + surcharge) * 0.04;
    totalTaxLiability = Math.round(baseTax + surcharge + cess);
  } else if (entityType === 'PARTNERSHIP') {
    // Firm / LLP: flat 30% + 4% cess = 31.2% (surcharge 12% if income > 1 Cr)
    baseTax = effectiveTaxableIncome * 0.3;
    const surcharge = effectiveTaxableIncome > 10000000 ? baseTax * 0.12 : 0;
    cess = (baseTax + surcharge) * 0.04;
    totalTaxLiability = Math.round(baseTax + surcharge + cess);
  } else {
    // Individual / Proprietorship Slab (New Regime FY 2025-26 / 2026-27)
    // 0-3L: Nil, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, >15L: 30%
    let rem = effectiveTaxableIncome;
    if (rem > 1500000) {
      baseTax += (rem - 1500000) * 0.3;
      rem = 1500000;
    }
    if (rem > 1200000) {
      baseTax += (rem - 1200000) * 0.2;
      rem = 1200000;
    }
    if (rem > 1000000) {
      baseTax += (rem - 1000000) * 0.15;
      rem = 1000000;
    }
    if (rem > 700000) {
      baseTax += (rem - 700000) * 0.1;
      rem = 700000;
    }
    if (rem > 300000) {
      baseTax += (rem - 300000) * 0.05;
      rem = 300000;
    }
    cess = baseTax * 0.04;
    totalTaxLiability = Math.round(baseTax + cess);
  }

  // Advance Tax Installment Requirements
  const inst1Target = Math.round(totalTaxLiability * 0.15); // 15% by 15 June
  const inst2Target = Math.round(totalTaxLiability * 0.45); // 45% cumulative by 15 Sept
  const inst3Target = Math.round(totalTaxLiability * 0.75); // 75% cumulative by 15 Dec
  const inst4Target = totalTaxLiability; // 100% cumulative by 15 March

  const totalAdvancePaid =
    advancePaidQ1 + advancePaidQ2 + advancePaidQ3 + advancePaidQ4;
  const balanceTaxPayable = Math.max(0, totalTaxLiability - totalAdvancePaid);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <Calculator className="h-3 w-3" /> Income Tax & Statutory Advance
              Tax
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Income Tax & Advance Tax Estimator
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Corporate Tax (Sec 115BAA), Presumptive Taxation (Sec 44AD), and
            quarterly installment compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700"
          >
            <Printer className="h-4 w-4" />
            <span>Print CA Worksheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Estimated Net Profit
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-white">
            ₹{netTaxableIncome.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {((netTaxableIncome / grossTurnover) * 100).toFixed(1)}% Net Margin
            on Turnover
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Tax Liability
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-rose-400">
            ₹{totalTaxLiability.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Effective Tax Rate:{' '}
            {effectiveTaxableIncome > 0
              ? ((totalTaxLiability / effectiveTaxableIncome) * 100).toFixed(2)
              : 0}
            %
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Advance Tax Deposited
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-emerald-400">
            ₹{totalAdvancePaid.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Q1 + Q2 + Q3 challans paid
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Balance Tax Due (Q4)
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-blue-400">
            ₹{balanceTaxPayable.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pay by 15 March to avoid Sec 234B/C
          </p>
        </div>
      </div>

      {/* Main Grid: Parameters vs Tax Plan */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Input Form */}
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
              <Building2 className="h-4 w-4" /> 1. Tax Entity & Method
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Financial Year
                </label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="2025-26">FY 2025-26 (AY 2026-27)</option>
                  <option value="2026-27">FY 2026-27 (AY 2027-28)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Entity Structure
                </label>
                <select
                  value={entityType}
                  onChange={(e: any) => setEntityType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="CORPORATE">
                    Pvt Ltd Company (25.17% Sec 115BAA)
                  </option>
                  <option value="PARTNERSHIP">
                    LLP / Partnership Firm (31.2%)
                  </option>
                  <option value="INDIVIDUAL">
                    Sole Proprietor / Individual
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Assessment Scheme
                </label>
                <select
                  value={taxMethod}
                  onChange={(e: any) => setTaxMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="REGULAR">Regular Audit (Actual Profit)</option>
                  <option value="44AD_PRESUMPTIVE">
                    Sec 44AD Presumptive (6% / 8%)
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
              <TrendingUp className="h-4 w-4" /> 2. Turnover & Revenue Streams
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Gross Annual Turnover (₹)
                </label>
                <input
                  type="number"
                  value={grossTurnover}
                  onChange={(e) => setGrossTurnover(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">
                    Digital / Banking Receipts
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {digitalReceiptsPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={digitalReceiptsPct}
                  onChange={(e) =>
                    setDigitalReceiptsPct(Number(e.target.value))
                  }
                  className="w-full accent-amber-400"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>
                    Digital: ₹
                    {Math.round(digitalTurnover).toLocaleString('en-IN')}
                  </span>
                  <span>
                    Cash: ₹{Math.round(cashTurnover).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Cost of Goods Sold (Bullion/Stones)
                </label>
                <input
                  type="number"
                  value={cogsExpenses}
                  onChange={(e) => setCogsExpenses(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Operating & Staff Expenses (₹)
                </label>
                <input
                  type="number"
                  value={operatingExpenses}
                  onChange={(e) => setOperatingExpenses(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Depreciation (Sec 32) (₹)
                </label>
                <input
                  type="number"
                  value={depreciation}
                  onChange={(e) => setDepreciation(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Advance Tax Challan Log */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
              <Calendar className="h-4 w-4" /> 3. Advance Tax Challans Deposited
              (ITNS 280)
            </h3>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Q1 (15 June)
                </label>
                <input
                  type="number"
                  value={advancePaidQ1}
                  onChange={(e) => setAdvancePaidQ1(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Q2 (15 Sept)
                </label>
                <input
                  type="number"
                  value={advancePaidQ2}
                  onChange={(e) => setAdvancePaidQ2(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Q3 (15 Dec)
                </label>
                <input
                  type="number"
                  value={advancePaidQ3}
                  onChange={(e) => setAdvancePaidQ3(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  Q4 (15 March)
                </label>
                <input
                  type="number"
                  value={advancePaidQ4}
                  onChange={(e) => setAdvancePaidQ4(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tax Schedule Card */}
        <div className="space-y-6 lg:col-span-5">
          <div className="sticky top-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Tax Schedule & Liability
                </span>
                <h4 className="text-lg font-bold text-white">
                  Advance Tax Calendar
                </h4>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            {/* Installments Breakdown */}
            <div className="space-y-3 text-xs">
              {/* Q1 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    1st Installment (15% by 15 Jun)
                  </span>
                  <span className="font-mono font-bold text-white">
                    ₹{inst1Target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Paid: ₹{advancePaidQ1.toLocaleString('en-IN')}</span>
                  {advancePaidQ1 >= inst1Target ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Compliant
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-400">
                      Shortfall: ₹
                      {(inst1Target - advancePaidQ1).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Q2 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    2nd Installment (45% by 15 Sep)
                  </span>
                  <span className="font-mono font-bold text-white">
                    ₹{inst2Target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Cumulative Paid: ₹
                    {(advancePaidQ1 + advancePaidQ2).toLocaleString('en-IN')}
                  </span>
                  {advancePaidQ1 + advancePaidQ2 >= inst2Target ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Compliant
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-400">
                      Shortfall
                    </span>
                  )}
                </div>
              </div>

              {/* Q3 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    3rd Installment (75% by 15 Dec)
                  </span>
                  <span className="font-mono font-bold text-white">
                    ₹{inst3Target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Cumulative Paid: ₹
                    {(
                      advancePaidQ1 +
                      advancePaidQ2 +
                      advancePaidQ3
                    ).toLocaleString('en-IN')}
                  </span>
                  {advancePaidQ1 + advancePaidQ2 + advancePaidQ3 >=
                  inst3Target ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Compliant
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-400">
                      Shortfall
                    </span>
                  )}
                </div>
              </div>

              {/* Q4 */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300">
                    4th Installment (100% by 15 Mar)
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    ₹{inst4Target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Final Due Amount:</span>
                  <span className="font-mono font-bold text-white">
                    ₹{balanceTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Interest Warning if default */}
            {balanceTaxPayable > 10000 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold">
                    Sec 234B & 234C Compliance Alert
                  </div>
                  <div className="mt-0.5 text-[11px] text-amber-300/80">
                    Pay remaining ₹{balanceTaxPayable.toLocaleString('en-IN')}{' '}
                    before 15 March to avoid 1% monthly interest under Section
                    234C.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
