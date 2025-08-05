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
    <header className="border-b bg-black text-white">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <Image
              src={"/imua-logo.avif"}
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
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "text-[#00e5ff]"
                  : "text-[#9999aa] hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/staking"
              className={`text-sm font-medium transition-colors ${
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
          <div className="w-[280px] h-[40px]" />
        )}
      </div>
    </header>
  );
}
