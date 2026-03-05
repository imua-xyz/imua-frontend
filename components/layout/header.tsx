// components/layout/header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MultiWalletStatus } from "./MultiWalletStatus";
import { Token } from "@/types/tokens";
export function Header({ token }: { token: Token | null }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="border-b border-[#21212f] bg-black text-white backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link data-testid="header-logo" href="/" className="flex items-center">
            <Image
              src={"/logos/imua-logo.svg"}
              alt="IMUA"
              width={120}
              height={40}
              priority
              className="mr-2"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-6">
            <Link
              data-testid="nav-dashboard"
              href="/dashboard"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive("/dashboard")
                  ? "text-[#00e5ff]"
                  : "text-[#9999aa] hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              data-testid="nav-stake"
              href="/staking"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive("/staking")
                  ? "text-[#00e5ff]"
                  : "text-[#9999aa] hover:text-white"
              }`}
            >
              Stake
            </Link>
          </nav>
        </div>

        {/* Display wallet status */}
        {mounted && token ? (
          <MultiWalletStatus token={token} />
        ) : (
          <div className="w-[320px] h-[40px]" />
        )}
      </div>
    </header>
  );
}
