'use client';

import { useState, useEffect } from 'react';

type EmailComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  fromName?: string;
  replyTo?: string;
};

type SendMethod = 'app' | 'own';

export default function EmailComposeModal({
  isOpen,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  fromName,
  replyTo,
}: EmailComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Send method preference - stored in localStorage
  const [sendMethod, setSendMethod] = useState<SendMethod>('own');
  const [showMethodChoice, setShowMethodChoice] = useState(true);

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emailSendMethod') as SendMethod | null;
    if (saved) {
      setSendMethod(saved);
      setShowMethodChoice(false);
    }
  }, []);

  // Reset form when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);

  function saveMethodPreference(method: SendMethod) {
    setSendMethod(method);
    localStorage.setItem('emailSendMethod', method);
    setShowMethodChoice(false);
  }

  function resetMethodPreference() {
    localStorage.removeItem('emailSendMethod');
    setShowMethodChoice(true);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    // If using own email app, just open mailto
    if (sendMethod === 'own') {
      openMailto();
      return;
    }

    // Otherwise try to send via app
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          from_name: fromName,
          reply_to: replyTo,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setTo('');
          setSubject('');
          setBody('');
        }, 1500);
      } else if (data.fallback === 'mailto') {
        // SMTP not configured, notify user and offer mailto
        setError('App email not configured. Use "My Email App" instead, or contact your administrator.');
      } else {
        setError(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Failed to send. Try using "My Email App" instead.');
    } finally {
      setSending(false);
    }
  }

  function openMailto() {
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setTo('');
      setSubject('');
      setBody('');
    }, 1000);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Compose Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {sendMethod === 'own' ? 'Opening your email app...' : 'Email Sent!'}
            </p>
          </div>
        ) : showMethodChoice ? (
          /* Method Choice Screen */
          <div className="p-6">
            <p className="text-gray-600 mb-6 text-center">How would you like to send emails?</p>

            <div className="space-y-3">
              <button
                onClick={() => saveMethodPreference('own')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">My Email App</p>
                    <p className="text-sm text-gray-500">Opens Gmail, Outlook, or your default email app</p>
                    <p className="text-xs text-green-600 mt-1">Recommended - Uses your own email account</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => saveMethodPreference('app')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Send from SiteSense</p>
                    <p className="text-sm text-gray-500">Send directly without leaving the app</p>
                    <p className="text-xs text-gray-400 mt-1">Requires SMTP configuration by admin</p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              You can change this later in settings
            </p>
          </div>
        ) : (
          /* Email Compose Form */
          <form onSubmit={handleSend} className="p-4 space-y-4">
            {/* Current method indicator */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {sendMethod === 'own' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Will open in your email app</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Will send from SiteSense</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={resetMethodPreference}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Change
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={6}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Type your message..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  'Sending...'
                ) : sendMethod === 'own' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Email App
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
