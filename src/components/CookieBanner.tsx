"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    document.cookie =
      "cookie-consent=accepted; max-age=31536000; path=/; SameSite=Lax";
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    document.cookie =
      "cookie-consent=rejected; max-age=31536000; path=/; SameSite=Lax";
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500'>
      <div className='max-w-4xl mx-auto bg-surface border border-border rounded-2xl shadow-2xl p-4 sm:p-6'>
        <div className='flex items-start gap-3 sm:gap-4'>
          <div className='w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0'>
            <Cookie className='w-5 h-5 text-primary' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm sm:text-base text-text mb-1'>
              Usamos cookies <strong>estrictamente necesarias</strong> para que
              la app funcione (sesión, seguridad). Al pagar, Stripe usa cookies
              para prevenir fraude.
            </p>
            <p className='text-xs sm:text-sm text-text-muted'>
              No usamos cookies publicitarias ni de analítica.{" "}
              <Link href='/cookies' className='text-primary hover:underline'>
                Política de Cookies
              </Link>
            </p>
          </div>
          <button
            onClick={accept}
            className='shrink-0 sm:hidden p-1.5 rounded-lg hover:bg-border transition-colors'
            aria-label='Cerrar'>
            <X className='w-4 h-4' />
          </button>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:justify-end'>
          <button
            onClick={reject}
            className='px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-border transition-colors'>
            Solo necesarias
          </button>
          <button
            onClick={accept}
            className='px-4 py-2 text-sm font-medium rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors'>
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  );
}
