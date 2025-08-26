// components/ui/token-icon.tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TokenIconProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ src, alt, size = 24, className }: TokenIconProps) {
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-[#1a1a24]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-contain"
        style={{ width: "100%", height: "100%" }} // Ensure the image takes full space
      />
    </div>
  );
}
