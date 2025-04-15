'use client';

import { useAccount } from 'wagmi';
import { redirect } from 'next/navigation';

export default function XrpStakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In many cases, you might want to restrict access to the staking page
  // to only connected users, similar to other staking pages
  const { isConnected } = useAccount();

  // Check if user should be able to access the page
  const shouldAllowAccess = true; // Allow all users for now, but this could be conditional

  // If the user should not have access, redirect to home
  if (!shouldAllowAccess) {
    redirect('/');
  }

  return <div className="xrp-staking-layout">{children}</div>;
} 