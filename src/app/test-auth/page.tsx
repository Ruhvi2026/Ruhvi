'use client';

import { useState } from 'react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  sendPhoneVerification,
  verifyPhoneCode,
  linkEmailPasswordToSession,
  linkGoogleToSession,
  linkPhoneToSession,
  linkFacebookToSession,
} from '@/services/authService';

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const log = (msg: string) =>
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  const handleError = (e: any) => log(`Error: ${e.message || e}`);

  const handleEmailSignUp = async () => {
    try {
      log('Signing up with email...');
      const res = await signUpWithEmail(email, password);
      log(`Signed up: ${res?.user.email}`);
    } catch (e) {
      handleError(e);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      log('Signing in with email...');
      const res = await signInWithEmail(email, password);
      log(`Signed in: ${res?.user.email}`);
    } catch (e) {
      handleError(e);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      log('Signing in with Google...');
      const res = await signInWithGoogle();
      log(`Signed in: ${res?.user.email}`);
    } catch (e) {
      handleError(e);
    }
  };

  const handlePhoneSend = async () => {
    try {
      log('Sending phone verification code...');
      const res = await sendPhoneVerification(phone, 'recaptcha-container');
      setConfirmationResult(res);
      log('Code sent!');
    } catch (e) {
      handleError(e);
    }
  };

  const handlePhoneVerify = async () => {
    try {
      log('Verifying code...');
      if (!confirmationResult) throw new Error('No confirmation result');
      const res = await verifyPhoneCode(confirmationResult, code);
      log(`Phone verified: ${res?.user.phoneNumber}`);
    } catch (e) {
      handleError(e);
    }
  };

  // Linking tests
  const handleLinkEmail = async () => {
    try {
      log('Linking Email...');
      await linkEmailPasswordToSession(email, password);
      log('Email linked successfully!');
    } catch (e) {
      handleError(e);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      log('Linking Google...');
      await linkGoogleToSession();
      log('Google linked successfully!');
    } catch (e) {
      handleError(e);
    }
  };

  const handleLinkPhoneSend = async () => {
    try {
      log('Sending link phone verification code...');
      const res = await linkPhoneToSession(phone, 'recaptcha-container');
      setConfirmationResult(res);
      log('Code sent for linking!');
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-8 font-sans">
      <h1 className="mb-6 text-2xl font-bold">Auth Integration Test Harness</h1>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded border bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold text-black">Email / Password</h2>
            <input
              className="mb-2 block w-full border p-1 text-black"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="mb-2 block w-full border p-1 text-black"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2 text-black">
              <button
                className="rounded bg-blue-500 px-3 py-1 text-white"
                onClick={handleEmailSignUp}
              >
                Sign Up
              </button>
              <button
                className="rounded bg-green-500 px-3 py-1 text-white"
                onClick={handleEmailSignIn}
              >
                Sign In
              </button>
              <button
                className="rounded bg-purple-500 px-3 py-1 text-white"
                onClick={handleLinkEmail}
              >
                Link to Session
              </button>
            </div>
          </div>

          <div className="rounded border bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold text-black">Social OAuth</h2>
            <div className="flex gap-2">
              <button
                className="rounded bg-red-500 px-3 py-1 text-white"
                onClick={handleGoogleSignIn}
              >
                Sign In Google
              </button>
              <button
                className="rounded bg-purple-500 px-3 py-1 text-white"
                onClick={handleLinkGoogle}
              >
                Link Google
              </button>
            </div>
          </div>

          <div className="rounded border bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold text-black">Phone Auth</h2>
            <input
              className="mb-2 block w-full border p-1 text-black"
              placeholder="Phone (+1234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div id="recaptcha-container"></div>
            <div className="mb-2 flex gap-2 text-black">
              <button
                className="rounded bg-blue-500 px-3 py-1 text-white"
                onClick={handlePhoneSend}
              >
                Send Code
              </button>
              <button
                className="rounded bg-purple-500 px-3 py-1 text-white"
                onClick={handleLinkPhoneSend}
              >
                Link Phone Send
              </button>
            </div>

            <input
              className="mb-2 block w-full border p-1 text-black"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="rounded bg-green-500 px-3 py-1 text-white"
              onClick={handlePhoneVerify}
            >
              Verify Code
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto rounded border bg-gray-900 p-4 font-mono text-sm text-green-400">
          <h2 className="sticky top-0 mb-2 bg-gray-900 font-bold text-white">
            Logs
          </h2>
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
