// components/BootstrapPhaseBanner.tsx
import { useEffect, useState } from "react";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { BootstrapStatus } from "@/types/bootstrap-status";

type BootstrapPhaseBannerProps = {
  bootstrapStatus: BootstrapStatus;
};

export function BootstrapPhaseBanner({
  bootstrapStatus,
}: BootstrapPhaseBannerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Update countdown timer every second
  useEffect(() => {
    if (!bootstrapStatus) return;

    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);

      if (bootstrapStatus.phase === "pre-lock") {
        const lockTime =
          bootstrapStatus.spawnTime - bootstrapStatus.offsetDuration;
        const secondsLeft = Math.max(0, lockTime - now);
        setTimeLeft(secondsLeft);
      } else if (bootstrapStatus.phase === "locked") {
        const secondsLeft = Math.max(0, bootstrapStatus.spawnTime - now);
        setTimeLeft(secondsLeft);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [bootstrapStatus]);

  if (!bootstrapStatus) return null;

  // Format time in days, hours, minutes, seconds
  function formatTimeLeft(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  // Pre-lock phase banner (blue)
  if (bootstrapStatus.phase === "pre-lock") {
    return (
      <div className="mb-6 p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="text-blue-400 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-blue-400 font-medium text-lg">
              Pre-Bootstrap Phase
            </h3>
            <p className="text-[#9999aa] mt-1">
              Staking is open. You can stake assets and delegate to validators.
              <span className="text-white font-medium ml-1">
                Lock phase begins in {formatTimeLeft(timeLeft)}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Locked phase banner (amber)
  if (bootstrapStatus.phase === "locked") {
    return (
      <div className="mb-6 p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="text-amber-400 mt-0.5 flex-shrink-0"
            size={20}
          />
          <div>
            <h3 className="text-amber-400 font-medium text-lg">
              Bootstrap Phase
            </h3>
            <p className="text-[#9999aa] mt-1">
              Imuachain is preparing to launch. Staking is now closed.
              <span className="text-white font-medium ml-1">
                Imuachain will launch in {formatTimeLeft(timeLeft)}
              </span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 bg-[#222233] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${100 - (timeLeft / bootstrapStatus.offsetDuration) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-[#9999aa]">
                {Math.floor(
                  (1 - timeLeft / bootstrapStatus.offsetDuration) * 100,
                )}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bootstrapped phase - small success indicator
  if (bootstrapStatus.phase === "bootstrapped") {
    return (
      <div className="mb-6 p-3 bg-green-950/20 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-400 flex-shrink-0" size={16} />
          <p className="text-green-400 text-sm">
            Imuachain is live and operational. You can stake, delegate, and earn
            rewards.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
