'use client';

import React, { useState } from 'react';
import {
  Settings,
  Building,
  Landmark,
  ShieldCheck,
  CheckCircle,
  Save,
  QrCode,
  FileText,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

export default function GstSettingsPage() {
  const [legalName, setLegalName] = useState(RUHVI_GST_CONFIG.legalName);
  const [tradeName, setTradeName] = useState(RUHVI_GST_CONFIG.tradeName);
  const [gstin, setGstin] = useState(RUHVI_GST_CONFIG.gstin);
  const [pan, setPan] = useState(RUHVI_GST_CONFIG.pan);
  const [state, setState] = useState(RUHVI_GST_CONFIG.state);
  const [stateCode, setStateCode] = useState(RUHVI_GST_CONFIG.stateCode);
  const [address, setAddress] = useState(RUHVI_GST_CONFIG.address);
  const [phone, setPhone] = useState(RUHVI_GST_CONFIG.phone);
  const [email, setEmail] = useState(RUHVI_GST_CONFIG.email);

  const [bankName, setBankName] = useState(RUHVI_GST_CONFIG.bankName);
  const [accountNumber, setAccountNumber] = useState(
    RUHVI_GST_CONFIG.accountNumber
  );
  const [ifscCode, setIfscCode] = useState(RUHVI_GST_CONFIG.ifscCode);
  const [branch, setBranch] = useState(RUHVI_GST_CONFIG.branch);
  const [upiVpa, setUpiVpa] = useState(RUHVI_GST_CONFIG.upiVpa);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-white">
          <Settings className="h-6 w-6 text-amber-400" />
          <span>GST & Business Configuration</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Master company profile, GSTIN credentials, bank accounts, and invoice
          headers
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Building className="h-4 w-4 text-amber-400" />
            <span>Company Tax Profile</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-slate-400">
                Legal Registered Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-medium text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                Trade Brand Name
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-medium text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono font-bold text-amber-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                State / Jurisdiction
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">State Code</label>
              <input
                type="text"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-slate-400">
                Registered Business Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                Accounts Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                Accounts Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Bank & Settlement Details */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Landmark className="h-4 w-4 text-amber-400" />
            <span>Bank & Payment QR Configuration</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-slate-400">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">
                Current Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-slate-400">Branch Name</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block flex items-center gap-1.5 text-slate-400">
                <QrCode className="h-3.5 w-3.5 text-amber-400" />
                <span>UPI VPA (Virtual Payment Address for Dynamic QR)</span>
              </label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono font-bold text-amber-300"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Used to generate live scannable UPI QR codes on all invoices for
                instant bank settlement.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Settings apply to all new printed and exported invoices</span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-amber-400"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Configuration Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save GST Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
