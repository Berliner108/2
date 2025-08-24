'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import '../styles/header.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Aktuelle Seite inkl. Query
  const current = pathname + (sp.toString() ? `?${sp.toString()}` : '');

  // Login/Registrieren mit Rücksprungziel
  const loginHref = `/login?redirect=${encodeURIComponent(current)}`;
  const registerHref = `/registrieren?redirect=${encodeURIComponent(current)}`;

  const toggleMenu = () => setMenuOpen(m => !m);

  const firstName =
    (user?.user_metadata?.firstName as string | undefined) ||
    (user?.user_metadata?.first_name as string | undefined) ||
    (user?.user_metadata?.given_name as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // aktuelle Session/User ziehen
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));

    // auf Auth-Änderungen reagieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    // Nach dem Logout zur Login-Seite inkl. redirect zurück auf die aktuelle Seite
    const afterLogout = loginHref;

    try {
      // Serverseitig Supabase-Cookies (Access & Refresh) killen
      await fetch(`/auth/signout?next=${encodeURIComponent(afterLogout)}`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      });
    } finally {
      // Optional: clientseitig aufräumen
      try { await supabaseBrowser().auth.signOut(); } catch {}
      setUser(null);
      setMenuOpen(false);
      router.replace(afterLogout);
      router.refresh(); // RSC/Prefetch invalidieren
    }
  };

  return (
    <header>
      <div className="header-container">
        {/* Logo + Text als Home-Link */}
        <Link href="/" className="home-link">
          <div className="logo-container">
            <svg width="118" height="70" viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10,40 Q90,60 170,40"
                fill="none"
                stroke="url(#turquoiseGradient)"
                strokeWidth="43"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="turquoiseGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" style={{ stopColor: '#00e5ff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#00b4d8', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>

            <div className="shop-title">
              <span className="black-text">Beschichter S</span>
              <span className="white-text">cout</span>
            </div>
          </div>

          <div className="center-text">
            <span>Die Nr.1 Plattform für Oberflächentechnik</span>
          </div>
        </Link>

        {/* Desktop-Navigation */}
        <div className="nav-links desktop">
          <ul>
            {firstName ? (
              <>
                <li className="welcome-text">
                  Hallo, <span className="name-highlight">{firstName}</span>
                </li>
                <li>
                  <button onClick={handleLogout} className="logout-btn">Logout</button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href={loginHref} prefetch={false} onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                </li>
                <li>
                  <Link href={registerHref} prefetch={false} onClick={() => setMenuOpen(false)}>
                    Registrieren
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Hamburger */}
        <button className="menu-button" onClick={toggleMenu}>
          <div></div><div></div><div></div>
        </button>
      </div>

      {/* Full Width Bar (Nur Mobil) */}
      <div className="full-width-bar">Die Nr.1 Plattform für Oberflächentechnik</div>

      {/* Mobile Overlay */}
      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)}></div>}

      {/* Mobile-Navigation */}
      <div className={`nav-links mobile ${menuOpen ? 'open' : ''}`}>
        <ul>
          {firstName ? (
            <>
              <li className="welcome-text">Hallo, {firstName}</li>
              <li>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setTimeout(handleLogout, 100);
                  }}
                  className="logout-btn"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href={loginHref} prefetch={false} onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
              </li>
              <li>
                <Link href={registerHref} prefetch={false} onClick={() => setMenuOpen(false)}>
                  Registrieren
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </header>
  );
};

export default Header;
