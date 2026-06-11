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
  const [visible, setVisible]     = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [leaving, setLeaving]     = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - Number(ts) < DISMISS_DAYS * 864e5) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;

    if (ios) {
      setIsIOS(true);
      const t = setTimeout(() => setVisible(true), 20000);
      return () => clearTimeout(t);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setVisible(true), 20000);
      return () => clearTimeout(t);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(true);
      setTimeout(() => dismiss(), 4000);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
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
    if (outcome === 'accepted') {
      setInstalled(true);
      setTimeout(() => dismiss(), 4000);
      return;
    }
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes pwaSlideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pwaSlideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(120%); opacity: 0; }
        }
        .pwa-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100vw - 24px);
          max-width: 460px;
          z-index: 9999;
          animation: pwaSlideUp .42s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pwa-banner.leaving { animation: pwaSlideDown .38s ease-in forwards; }
        .pwa-inner {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(27,67,50,.22), 0 2px 8px rgba(0,0,0,.1);
          border: 1px solid rgba(201,168,76,.25);
          position: relative;
        }
        .pwa-stripe {
          height: 4px;
          background: linear-gradient(90deg, #1B4332 0%, #C9A84C 60%, #1B4332 100%);
        }
        .pwa-body {
          padding: 16px 16px 18px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .pwa-icon {
          flex-shrink: 0;
          width: 48px; height: 48px;
          background: #1B4332;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(27,67,50,.3);
        }
        .pwa-icon span { color: #C9A84C; font-size: 24px; font-weight: 700; font-family: Georgia, serif; line-height: 1; }
        .pwa-content { flex: 1; min-width: 0; }
        .pwa-eyebrow {
          font-size: 9px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: #C9A84C;
          font-family: 'Josefin Sans', sans-serif; margin-bottom: 3px;
        }
        .pwa-headline {
          font-size: 18px; font-weight: 700; color: #111;
          font-family: Georgia, serif; line-height: 1.18; margin-bottom: 5px;
        }
        .pwa-sub {
          font-size: 12.5px; color: #6B7280; line-height: 1.5;
          font-weight: 300; margin-bottom: 14px;
        }
        .pwa-sub strong { color: #1B4332; font-weight: 600; }
        .pwa-actions { display: flex; gap: 10px; align-items: center; }
        .pwa-install-btn {
          flex: 1; padding: 10px 14px;
          background: #1B4332; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          border: none; border-radius: 8px; cursor: pointer;
          font-family: 'Josefin Sans', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: background .18s, transform .12s; white-space: nowrap;
        }
        .pwa-install-btn:hover:not(:disabled) { background: #145a32; transform: scale(1.02); }
        .pwa-install-btn:disabled { opacity: .65; cursor: wait; }
        .pwa-dismiss-link {
          font-size: 11px; color: #9CA3AF; cursor: pointer;
          background: none; border: none; padding: 4px;
          font-family: 'Josefin Sans', sans-serif; letter-spacing: .06em;
          white-space: nowrap; transition: color .15s;
        }
        .pwa-dismiss-link:hover { color: #6B7280; }
        .pwa-close {
          position: absolute; top: 12px; right: 12px;
          background: none; border: none; cursor: pointer;
          color: #9CA3AF; padding: 4px; line-height: 1; font-size: 16px;
          transition: color .15s;
        }
        .pwa-close:hover { color: #111; }
        .pwa-success { text-align: center; padding: 20px 16px; }
        .pwa-success-icon {
          width: 48px; height: 48px; background: #1B4332; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .pwa-share-arrow { display: inline-block; animation: bounce 1.4s ease-in-out infinite; }
        @media (max-width: 380px) {
          .pwa-headline { font-size: 16px; }
          .pwa-sub { font-size: 12px; }
          .pwa-body { gap: 10px; padding: 14px 12px 16px; }
        }
      `}</style>

      <div className={`pwa-banner${leaving ? ' leaving' : ''}`}>
        <div className="pwa-inner">
          <div className="pwa-stripe" />
          <button className="pwa-close" onClick={dismiss} aria-label="Dismiss">✕</button>

          {installed ? (
            <div className="pwa-success">
              <div className="pwa-success-icon">
                <svg width="24" height="24" fill="none" stroke="#C9A84C" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="pwa-eyebrow" style={{ textAlign: 'center' }}>App Installed</p>
              <p className="pwa-headline" style={{ textAlign: 'center', fontSize: 17 }}>You&apos;re all set!</p>
              <p className="pwa-sub" style={{ textAlign: 'center', marginBottom: 0 }}>
                Arah is now on your home screen. <strong>Open it from there</strong> for the fastest, app-like experience.
              </p>
            </div>
          ) : (
            <div className="pwa-body">
              <div className="pwa-icon"><span>A</span></div>
              <div className="pwa-content">
                {isIOS ? (
                  <>
                    <p className="pwa-eyebrow">Add to Home Screen</p>
                    <p className="pwa-headline">Never run out of stock again.</p>
                    <p className="pwa-sub">
                      Tap <span className="pwa-share-arrow">↑</span> <strong>Share</strong> below, then <strong>&ldquo;Add to Home Screen&rdquo;</strong> for the full app experience.
                    </p>
                    <div className="pwa-actions">
                      <button className="pwa-install-btn" onClick={dismiss}>Got it — I&apos;ll add it</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="pwa-eyebrow">Free App Available</p>
                    <p className="pwa-headline">Never run out of stock again.</p>
                    <p className="pwa-sub">
                      Install on your home screen — <strong>shop faster</strong>, browse <strong>offline</strong>.
                    </p>
                    <div className="pwa-actions">
                      <button className="pwa-install-btn" onClick={install} disabled={installing}>
                        {installing ? 'Installing…' : (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
          )}
        </div>
      </div>
    </>
  );
}
