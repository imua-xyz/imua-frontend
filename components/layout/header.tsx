// components/layout/header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MultiWalletStatus } from "./MultiWalletStatus";
import { Token } from "@/types/tokens";

export function Header({ token }: { token: Token | null }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b bg-black text-white">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
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
        
        {/* Display both wallet types */}
        {mounted && token ? <MultiWalletStatus token={token} /> : <div className="w-[280px] h-[40px]" />}
      </div>
    </header>
  );
}