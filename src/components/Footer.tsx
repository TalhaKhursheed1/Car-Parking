'use client';

import Link from 'next/link';
import { FacebookIcon, InstagramIcon, TwitterIcon } from '@/components/icons/SocialIcons';
import { useCurrentUser } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/authStore';

export default function Footer() {
  useCurrentUser();
  const { isAuthenticated } = useAuthStore();

  return (
    <footer className="w-full border-t mt-16 relative overflow-hidden" style={{
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(16px)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    }}>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-12" style={{ gap: '3rem' }}>
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="flex items-center mb-6" style={{ gap: '0.75rem' }}>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)] bg-gradient-to-br from-primary/80 to-secondary/80 border border-white/20"
              >
                <span className="text-white font-extrabold text-lg">P</span>
              </div>
              <span className="text-foreground font-extrabold text-2xl tracking-tight">
                ParkSpace
              </span>
            </div>
            <p className="text-muted text-base max-w-md leading-relaxed mb-8">
              Your premium platform for finding and renting parking spaces. 
              Making urban mobility more convenient, secure, and accessible for everyone.
            </p>
            <div className="flex" style={{ gap: '1rem' }}>
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-foreground transition-all duration-300 hover:scale-110 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
                aria-label="Facebook"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-foreground transition-all duration-300 hover:scale-110 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
                aria-label="X / Twitter"
              >
                <TwitterIcon className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-foreground transition-all duration-300 hover:scale-110 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground font-bold text-lg mb-6">Quick Links</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li>
                <Link href="/" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                  Contact
                </Link>
              </li>
              {!isAuthenticated && (
                <li>
                  <Link href="/register" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                    Register
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-foreground font-bold text-lg mb-6">Account</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!isAuthenticated ? (
                <>
                  <li>
                    <Link href="/login" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                      Become a Provider
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link href="/register" className="text-muted hover:text-primary transition-colors text-sm font-semibold">
                    Become a Provider
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center" style={{ gap: '1.5rem' }}>
          <p className="text-muted text-sm font-semibold">
            © 2024 ParkSpace. All rights reserved.
          </p>
          <div className="flex" style={{ gap: '2rem' }}>
            <Link href="/terms" className="text-muted hover:text-foreground transition-colors text-sm font-semibold">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted hover:text-foreground transition-colors text-sm font-semibold">
              Privacy
            </Link>
            <Link href="/contact" className="text-muted hover:text-foreground transition-colors text-sm font-semibold">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
