'use client';

import { useEffect } from 'react';

const INTERVAL_MS = 90_000;

async function pingVectorizerActivity() {
  try {
    await fetch('/api/workers/vectorizer-activity', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } catch {
    /* non-fatal: local dev without vectorizer or network blip */
  }
}

/**
 * Keeps the vectorizer warm while this workspace shell is open (signed-in or demo).
 * Server requires a session; demo bootstrap sets a session before redirecting here.
 */
export default function VectorizerActivityClient() {
  useEffect(() => {
    void pingVectorizerActivity();
    const id = window.setInterval(() => void pingVectorizerActivity(), INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void pingVectorizerActivity();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
