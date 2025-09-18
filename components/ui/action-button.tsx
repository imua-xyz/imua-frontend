// components/ui/action-button.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseClasses = `
      group relative overflow-hidden
      font-semibold rounded-xl
      shadow-lg transform transition-all duration-200 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      disabled:transform-none disabled:shadow-none
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#15151c]
      select-none
    `;

    const variantClasses = {
      primary: `
        bg-gradient-to-r from-[#00e5ff] to-[#00c8df]
        hover:from-[#00c8df] hover:to-[#00b8cf]
        active:from-[#00b8cf] active:to-[#00a8bf]
        text-black
        shadow-[#00e5ff]/25 hover:shadow-xl hover:shadow-[#00e5ff]/30
        border border-[#00e5ff]/20
        focus:ring-[#00e5ff]/50
      `,
      secondary: `
        bg-gradient-to-r from-[#1a1a24] to-[#222233]
        hover:from-[#222233] hover:to-[#292936]
        active:from-[#292936] active:to-[#333344]
        text-white
        shadow-[#1a1a24]/25 hover:shadow-xl hover:shadow-[#1a1a24]/30
        border border-[#333344]
        focus:ring-[#333344]/50
      `,
      outline: `
        bg-transparent
        hover:bg-[#1a1a24]
        active:bg-[#222233]
        text-white
        border border-[#333344] hover:border-[#00e5ff]/50
        focus:ring-[#00e5ff]/50
      `,
      ghost: `
        bg-transparent
        hover:bg-[#1a1a24]/50
        active:bg-[#1a1a24]
        text-[#9999aa] hover:text-white
        focus:ring-[#00e5ff]/50
      `,
    };

    const sizeClasses = {
      sm: "px-4 py-2 text-sm min-w-[100px] h-9",
      md: "px-6 py-3 text-sm min-w-[120px] h-12",
      lg: "px-8 py-4 text-base min-w-[140px] h-14",
    };

    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          loading ? "cursor-wait" : "cursor-pointer",
          className,
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isDisabled && props.onClick) {
              // Convert keyboard event to mouse event for onClick handler
              props.onClick(
                e as unknown as React.MouseEvent<HTMLButtonElement>,
              );
            }
          }
        }}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && (
            <div
              className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
              aria-hidden="true"
            />
          )}
          {loading && loadingText ? loadingText : children}
        </span>

        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-current/20 to-current/20 animate-pulse" />
        )}

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
      </Button>
    );
  },
);

ActionButton.displayName = "ActionButton";

export { ActionButton };
