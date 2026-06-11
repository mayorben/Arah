'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'arah_pwa_dismissed';
const DISMISS_DAYS = 14;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]   = useState(false);
  const [isIOS, setIsIOS]       = useState(false);
  const [installing, setInstalling] = useState(false);
  const [leaving, setLeaving]   = useState(false);

  useEffect(() => {
    // Already installed in standalone mode — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Already dismissed recently
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - Number(ts) < DISMISS_DAYS * 864e5) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;

    if (ios) {
      setIsIOS(true);
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => { setVisible(false); setLeaving(false); }, 380);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') { dismiss(); return; }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(120%); opacity: 0; }
        }
        .pwa-banner {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100vw - 32px);
          max-width: 480px;
          z-index: 9999;
          animation: slideUp .42s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pwa-banner.leaving {
          animation: slideDown .38s ease-in forwards;
        }
        .pwa-inner {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(27,67,50,.22), 0 2px 8px rgba(0,0,0,.1);
          border: 1px solid rgba(201,168,76,.25);
        }
        /* green accent stripe at top */
        .pwa-stripe {
          height: 4px;
          background: linear-gradient(90deg, #1B4332 0%, #C9A84C 60%, #1B4332 100%);
        }
        .pwa-body {
          padding: 20px 20px 22px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .pwa-icon {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          background: #1B4332;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(27,67,50,.3);
        }
        .pwa-icon span {
          color: #C9A84C;
          font-size: 26px;
          font-weight: 700;
          font-family: Georgia, serif;
          line-height: 1;
        }
        .pwa-content { flex: 1; min-width: 0; }
        .pwa-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #C9A84C;
          font-family: 'Josefin Sans', sans-serif;
          margin-bottom: 4px;
        }
        .pwa-headline {
          font-size: 20px;
          font-weight: 700;
          color: #111;
          font-family: Georgia, serif;
          line-height: 1.18;
          margin-bottom: 6px;
        }
        .pwa-sub {
          font-size: 13px;
          color: #6B7280;
          line-height: 1.55;
          font-weight: 300;
          margin-bottom: 16px;
        }
        .pwa-sub strong { color: #1B4332; font-weight: 600; }
        .pwa-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .pwa-install-btn {
          flex: 1;
          padding: 11px 16px;
          background: #1B4332;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Josefin Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: background .18s, transform .12s;
          white-space: nowrap;
        }
        .pwa-install-btn:hover:not(:disabled) { background: #145a32; transform: scale(1.02); }
        .pwa-install-btn:disabled { opacity: .65; cursor: wait; }
        .pwa-dismiss-link {
          font-size: 11px;
          color: #9CA3AF;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px;
          font-family: 'Josefin Sans', sans-serif;
          letter-spacing: .06em;
          white-space: nowrap;
          transition: color .15s;
        }
        .pwa-dismiss-link:hover { color: #6B7280; }
        .pwa-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9CA3AF;
          padding: 4px;
          line-height: 1;
          font-size: 18px;
          transition: color .15s;
        }
        .pwa-close:hover { color: #111; }

        /* iOS share icon pulse */
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .pwa-share-arrow { display: inline-block; animation: bounce 1.4s ease-in-out infinite; }
      `}</style>

      <div className={`pwa-banner${leaving ? ' leaving' : ''}`}>
        <div className="pwa-inner" style={{ position: 'relative' }}>
          <div className="pwa-stripe" />
          <button className="pwa-close" onClick={dismiss} aria-label="Dismiss">✕</button>

          <div className="pwa-body">
            <div className="pwa-icon"><span>A</span></div>

            <div className="pwa-content">
              {isIOS ? (
                <>
                  <p className="pwa-eyebrow">Add to Home Screen</p>
                  <p className="pwa-headline">Your pantry, one tap away.</p>
                  <p className="pwa-sub">
                    Tap <span className="pwa-share-arrow">↑</span> <strong>Share</strong> at the bottom of your browser, then choose <strong>"Add to Home Screen"</strong> for the full app experience.
                  </p>
                  <div className="pwa-actions">
                    <button className="pwa-install-btn" onClick={dismiss}>
                      Got it — I'll add it
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="pwa-eyebrow">Free App Available</p>
                  <p className="pwa-headline">Never run out again.</p>
                  <p className="pwa-sub">
                    Install Arah on your home screen — <strong>shop in seconds</strong>, get faster load times, and even browse <strong>offline</strong>.
                  </p>
                  <div className="pwa-actions">
                    <button className="pwa-install-btn" onClick={install} disabled={installing}>
                      {installing ? (
                        'Installing…'
                      ) : (
                        <>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Install — It&apos;s Free
                        </>
                      )}
                    </button>
                    <button className="pwa-dismiss-link" onClick={dismiss}>Not now</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
