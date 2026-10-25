'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  QrCode,
  Key,
  Copy,
  Check,
  Download,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (backupCodes: string[]) => void;
}

export default function MfaSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: MfaSetupModalProps) {
  const [step, setStep] = useState<'scan' | 'backup_codes'>('scan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup data returned from /api/auth/mfa/setup
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // Verification code input
  const [verificationCode, setVerificationCode] = useState('');
  const [showManualKey, setShowManualKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Backup codes returned from /api/auth/mfa/activate
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Initialize setup on modal open
  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setError(null);
      setVerificationCode('');
      fetchSetupData();
    }
  }, [isOpen]);

  const fetchSetupData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize 2FA setup.');
      }
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setManualSecret(data.manualSecret);
      setSetupToken(data.setupToken);
      setAccountEmail(data.accountEmail);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate 2FA QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!manualSecret) return;
    navigator.clipboard.writeText(manualSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (backupCodes.length === 0) return;
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    if (backupCodes.length === 0) return;
    const content = `RUHVI FINE JEWELLERY — 2FA EMERGENCY BACKUP CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${accountEmail || 'Staff'}\n\nKeep these codes strictly private and safe. Each code can be used ONCE to log in if you lose your phone:\n\n${backupCodes.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruhvi-mfa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken || verificationCode.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupToken,
          code: verificationCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      setBackupCodes(data.backupCodes || []);
      setStep('backup_codes');
      if (onSuccess) {
        onSuccess(data.backupCodes);
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#FAF9F5] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C1B1A] text-[#C29831]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {step === 'scan'
                  ? 'Set Up Google Authenticator'
                  : 'Save Emergency Backup Codes'}
              </h3>
              <p className="text-xs text-gray-500">
                {step === 'scan'
                  ? 'Step 1 of 2: Scan QR code & verify'
                  : 'Step 2 of 2: Store recovery codes safely'}
              </p>
            </div>
          </div>
          {step === 'scan' && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* STEP 1: Scan QR Code & Enter 6-digit Code */}
          {step === 'scan' && (
            <div className="space-y-5">
              {loading && !qrCodeDataUrl ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  <p className="text-xs text-gray-500">Generating secure QR code...</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-600">
                    Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or your password manager on your phone and scan the QR code below:
                  </p>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                    {qrCodeDataUrl ? (
                      <div className="overflow-hidden rounded-lg bg-white p-2 shadow-sm">
                        <Image
                          src={qrCodeDataUrl}
                          alt="2FA QR Code"
                          width={200}
                          height={200}
                          className="h-48 w-48 object-contain"
                          priority
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-48 items-center justify-center text-gray-400">
                        <QrCode className="h-12 w-12" />
                      </div>
                    )}

                    {/* Manual Secret Key toggle */}
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowManualKey(!showManualKey)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {showManualKey
                          ? 'Hide manual setup key'
                          : "Can't scan? Enter key manually"}
                      </button>

                      {showManualKey && manualSecret && (
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800 tracking-wider">
                            {manualSecret}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyKey}
                            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                          >
                            {copiedKey ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedKey ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Form */}
                  <form onSubmit={handleActivate} className="space-y-4">
                    <div>
                      <label
                        htmlFor="setup-verify-code"
                        className="mb-1.5 block text-xs font-medium text-gray-700"
                      >
                        Enter 6-digit confirmation code from the app:
                      </label>
                      <input
                        id="setup-verify-code"
                        type="text"
                        required
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(e) =>
                          setVerificationCode(
                            e.target.value.replace(/\D/g, '').slice(0, 6)
                          )
                        }
                        placeholder="000000"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-mono text-xl font-semibold tracking-[0.4em] text-gray-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="w-full rounded-full bg-[#1C1B1A] py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-black active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {loading ? 'Activating 2FA...' : 'Verify & Activate'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Backup Codes Display */}
          {step === 'backup_codes' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex gap-2.5">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-900">
                      Save these recovery codes now!
                    </h4>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                      If you ever lose access to your authenticator device, each of these 8 codes can be used <strong>once</strong> to log into your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 shadow-sm"
                  >
                    <span className="text-xs text-gray-400 select-none">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold tracking-wider">{code}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Copy All & Download */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  {copiedBackupCodes ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedBackupCodes ? 'Copied All!' : 'Copy All Codes'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBackupCodes}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                  Download (.txt)
                </button>
              </div>

              {/* Final Finish Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-full bg-[#1C1B1A] py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-black active:scale-[0.98]"
                >
                  I Have Saved My Codes — Finish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
