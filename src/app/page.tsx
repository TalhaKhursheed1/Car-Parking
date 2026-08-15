"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AvailableSpacesSection from "@/components/home/AvailableSpacesSection";
import { useCurrentUser } from "@/features/auth/hooks";
import { useAuthStore } from "@/stores/authStore";
import type { LucideIcon } from "lucide-react";
import { DollarSign, Lock, Zap, Search } from "lucide-react";

export default function Home() {
  useCurrentUser();
  const { isAuthenticated, user } = useAuthStore();
  const isProvider = user?.role === "provider";
  const isAdmin = user?.role === "admin";
  const router = useRouter();
  const [cityQuery, setCityQuery] = useState("");

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative w-full max-w-7xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
              Find Your Perfect
              <br />
              <span className="text-gradient">Parking Space</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover convenient and affordable parking spaces across the city.
              Book instantly and park with confidence.
            </p>

            <div className="max-w-3xl mx-auto mb-10">
              <div className="glass-card p-3 flex flex-col sm:flex-row items-center gap-3 w-full">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const query = cityQuery.trim();
                    router.push(
                      query
                        ? `/spaces?city=${encodeURIComponent(query)}`
                        : "/spaces"
                    );
                  }}
                  className="flex flex-col sm:flex-row w-full gap-3"
                >
                  <div className="relative flex-1 flex items-center w-full">
                    <Search 
                      className="text-muted pointer-events-none" 
                      style={{ position: 'absolute', left: '1rem', width: '1.25rem', height: '1.25rem' }} 
                    />
                    <input
                      type="text"
                      placeholder="Search by city (e.g., Sydney, Melbourne)..."
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border-none text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-lg transition-all"
                      style={{ padding: '1rem 1rem 1rem 3rem' }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" size="lg" className="px-8 py-4 text-lg">
                      Search
                    </Button>
                  </div>
                </form>
              </div>
            </div>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Link href="/register">
                  <Button size="lg" className="px-8">Get Started Free</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="px-8">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
            {isProvider && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Link href="/provider/dashboard">
                  <Button size="lg">View Dashboard</Button>
                </Link>
                <Link href="/provider/spaces">
                  <Button variant="outline" size="lg" className="px-8">
                    View Spaces
                  </Button>
                </Link>
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Link href="/admin/dashboard">
                  <Button size="lg">View Dashboard</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <AvailableSpacesSection />

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 w-full relative">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Why Choose ParkSpace?
            </h2>
            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto">
              Experience the future of parking with our premium platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {(
              [
                {
                  icon: Lock,
                  title: "Secure & Safe",
                  description:
                    "All spaces are verified and monitored for your safety. Advanced security measures ensure peace of mind.",
                },
                {
                  icon: DollarSign,
                  title: "Affordable Rates",
                  description:
                    "Competitive prices with flexible payment options. Find the perfect space that fits your budget.",
                },
                {
                  icon: Zap,
                  title: "Instant Booking",
                  description:
                    "Book your space in seconds, no waiting required. Real-time availability updates keep you informed.",
                },
              ] satisfies { icon: LucideIcon; title: string; description: string }[]
            ).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} hover className="text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(124,58,237,0.2)]">
                      <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 w-full">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="text-center p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/30 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/30 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 tracking-tight">
                Ready to Get Started?
              </h2>
              <p className="text-base sm:text-lg text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of users who are already using ParkSpace to find
                and rent parking spaces.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isAuthenticated && (
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto px-8">
                      Create Account
                    </Button>
                  </Link>
                )}
                <Link href="/contact">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-8"
                  >
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
