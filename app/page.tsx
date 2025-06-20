"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div>
      <Header token={null} />
      <main className="container mx-auto p-4 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full">
          <Card className="shadow-lg border-2 border-gray-100 dark:border-gray-800">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                Staking Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <p className="text-center text-muted-foreground">
                Choose your preferred staking method:
              </p>

              <div className="space-y-4">
                <Link href="/evm-staking" passHref className="block">
                  <Button className="w-full h-14 text-lg font-medium transition-all hover:scale-[1.02]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    EVM Staking
                  </Button>
                  <p className="text-sm text-center mt-1 text-muted-foreground">
                    Stake using Ethereum Virtual Machine compatible wallets
                  </p>
                </Link>

                <Link href="/xrp-staking" passHref className="block">
                  <Button
                    className="w-full h-14 text-lg font-medium transition-all hover:scale-[1.02]"
                    variant="outline"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    XRP Staking
                  </Button>
                  <p className="text-sm text-center mt-1 text-muted-foreground">
                    Stake with XRP using Gem Wallet
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
