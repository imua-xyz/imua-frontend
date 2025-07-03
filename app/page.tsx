// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {/* IMUA Logo */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src={"/imua-logo.avif"}  // Make sure this file exists in your public directory
          alt="IMUA"
          width={400}
          height={120}
          priority
        />
      </motion.div>
      
      {/* Welcome Message */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold mb-2">Welcome to IMUA</h1>
        <p className="text-[#9999aa]">Decentralized Staking Platform</p>
      </motion.div>
      
      {/* Navigation Cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staking Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/staking">
            <div className="bg-[#15151c] hover:bg-[#1a1a24] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 h-full transition-all hover:border-[#00e5ff] hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <div className="text-2xl font-bold text-[#e631dc] mb-4">Staking</div>
              <p className="text-[#9999aa] mb-6">Deposit, delegate, and manage your token stakes</p>
              <div className="text-[#00e5ff]">Get started →</div>
            </div>
          </Link>
        </motion.div>
        
        {/* Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Link href="/dashboard">
            <div className="bg-[#15151c] hover:bg-[#1a1a24] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 h-full transition-all hover:border-[#00e5ff] hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <div className="text-2xl font-bold text-[#e631dc] mb-4">Dashboard</div>
              <p className="text-[#9999aa] mb-6">View your positions and track your rewards</p>
              <div className="text-[#00e5ff]">View dashboard →</div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}