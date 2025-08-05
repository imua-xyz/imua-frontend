// components/ui/progress-bar.tsx
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: string;
}

export function ProgressBar({
  value,
  className,
  color = "#00e5ff",
}: ProgressBarProps) {
  // Ensure value is between 0 and 100
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2 bg-[#222233] rounded-full overflow-hidden", className)}
    >
      <div
        className="h-full transition-all duration-500 ease-out"
        style={{
          width: `${safeValue}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
