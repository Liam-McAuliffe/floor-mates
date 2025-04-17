'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { X, Copy } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, inviteCode, floorId }) {
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inviteCode && typeof window !== 'undefined') {
      const url = `${window.location.origin}/floor/join?code=${inviteCode}`;
      setJoinUrl(url);
    }
  }, [inviteCode]);

  const handleCopy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL: ', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-medium p-6 rounded-lg shadow-xl relative max-w-md w-full border border-light/50">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">
          Invite to Floor
        </h2>

        {inviteCode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Join Code
              </label>
              <p className="text-2xl font-mono tracking-widest bg-dark px-3 py-1 rounded text-center text-white">
                {inviteCode}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Join Link
              </label>
              <div className="flex items-center gap-2 bg-dark px-3 py-2 rounded border border-light/30">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="bg-transparent text-white/90 text-sm flex-grow focus:outline-none"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  className="text-brand hover:text-white p-1 rounded hover:bg-light"
                  title="Copy Link"
                >
                  {copied ? (
                    <span className="text-xs text-green-400">Copied!</span>
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            {joinUrl && (
              <div className="text-center pt-4">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Scan QR Code
                </label>
                <div className="bg-white p-3 inline-block rounded">
                  <QRCode
                    value={joinUrl}
                    size={160}
                    bgColor="#FFFFFF"
                    fgColor="#0D1B2A"
                    level="L"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/70">Loading invitation details...</p> // Or show an error if fetch failed
        )}
      </div>
    </div>
  );
}
