'use client';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Hourglass } from "lucide-react";

type ProviderPendingNoticeProps = {
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

export function ProviderPendingNotice({
  onLogout,
  isLoggingOut,
}: ProviderPendingNoticeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full max-w-3xl space-y-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Account Under Review
          </h1>
          <p className="text-base sm:text-lg text-white/80">
            Thanks for registering as a provider. Your account is currently pending
            admin approval. This typically takes 2–10 hours. We&apos;ll notify you via
            email once your account is verified.
          </p>
        </div>

        <Card className="p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <Hourglass className="h-10 w-10 sm:h-12 sm:w-12 text-amber-300 shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Sit tight, we&apos;re reviewing your details
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                Our team verifies every provider to ensure a safe marketplace. You
                can update your profile information while you wait, but publishing
                spaces will be available after approval.
              </p>
            </div>
          </div>

          <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl p-6 text-white/80 text-sm sm:text-base">
            Need to speed things up? Reach us at{" "}
            <a href="mailto:support@parkspace.com" className="text-white font-semibold">
              support@parkspace.com
            </a>{" "}
            with your registration details.
          </div>

          {onLogout && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

