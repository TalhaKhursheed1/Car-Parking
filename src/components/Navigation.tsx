'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell, Car } from 'lucide-react';
import { useCurrentUser, useLogout } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useConsumerNotificationsUnreadCount } from '@/features/notifications/hooks';
import NavUserMenu from './NavUserMenu';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useCurrentUser();
  const { user, isAuthenticated } = useAuthStore();
  const logoutMutation = useLogout();
  const isConsumer = isAuthenticated && user?.role === 'consumer';
  const { data: unreadCount } = useConsumerNotificationsUnreadCount(isConsumer);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) => pathname === path;
  const profileHref =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'provider'
      ? '/provider/profile'
      : '/profile';

  const profileLabel = user?.role === 'admin' ? 'Admin' : 'Profile';

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setIsMenuOpen(false);
        router.push('/');
      },
    });
  };

  return (
    <header className="w-full sticky top-0 z-50 pt-2 px-2 sm:px-4">
      <nav className="w-full glass-card max-w-7xl mx-auto backdrop-blur-xl shadow-lg border border-white/10 rounded-2xl bg-white/5">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between" style={{ minHeight: '4.5rem', padding: '0.5rem 0' }}>
            {/* Logo */}
            <div className="flex items-center lg:flex-1">
              <Link href="/" className="flex items-center space-x-3 group" style={{ gap: '0.75rem' }}>
                <div 
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(to bottom right, rgba(124,58,237,0.8), rgba(6,182,212,0.8))',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 0 15px rgba(124,58,237,0.3)',
                    flexShrink: 0,
                  }}
                  className="transition-all duration-300"
                >
                  <Car className="text-white" style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-extrabold tracking-tight" style={{ fontSize: '1.25rem', display: 'block' }}>
                  ParkSpace
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center justify-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center h-10 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive(link.href) ? 'bg-white/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center justify-end lg:flex-1 gap-2">
              
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary flex items-center justify-center h-10 px-6 text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {user?.role === 'consumer' ? (
                    <>
                      <Link
                        href="/consumer/notifications"
                        aria-label="Notifications"
                        title="Notifications"
                        className="text-muted hover:text-foreground transition-all"
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.75rem',
                        }}
                      >
                        <Bell size={24} aria-hidden />
                        {unreadCount ? (
                          <span 
                            style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              lineHeight: 1,
                              padding: '2px 5px',
                              borderRadius: '9999px',
                              border: '2px solid #0A0A0F',
                              minWidth: '1.25rem',
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : null}
                      </Link>
                      <Link
                        href="/consumer/bookings"
                        className="flex items-center h-10 px-4 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-white/5 transition-all"
                      >
                        My bookings
                      </Link>
                    </>
                  ) : null}
                  {user ? (
                    <div className="ml-2 flex items-center">
                      <NavUserMenu
                        user={user}
                        profileHref={profileHref}
                        profileLabel={profileLabel}
                        onLogout={handleLogout}
                        isLoggingOut={logoutMutation.isPending}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-foreground hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 space-y-2 animate-fade-in-up border-t border-white/10 mt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive(link.href) ? 'bg-white/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-2 mt-2 border-t border-white/10 space-y-2">
                {!isAuthenticated ? (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center border border-white/10 text-foreground hover:bg-white/5"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-primary block px-4 py-2.5 text-sm text-center"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <>
                    {user?.role === 'consumer' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/consumer/notifications"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center border border-white/10 text-foreground hover:bg-white/5"
                        >
                          Notifications{unreadCount ? ` (${unreadCount})` : ''}
                        </Link>
                        <Link
                          href="/consumer/bookings"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center border border-white/10 text-foreground hover:bg-white/5"
                        >
                          My bookings
                        </Link>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={profileHref}
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center bg-primary/20 text-primary border border-primary/30"
                      >
                        {profileLabel}
                      </Link>
                      <button
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-center border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
