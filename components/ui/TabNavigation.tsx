// components/ui/TabNavigation.tsx
"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TabNavigationProps {
  tabs: {
    id: string
    label: string
  }[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onChange,
  className
}: TabNavigationProps) {
  return (
    <div className={cn("flex justify-center space-x-8", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            "relative py-2 font-medium transition-colors",
            activeTab === tab.id 
              ? "text-[#00e5ff]" // Hardcoded color to avoid Tailwind issues
              : "text-[#9999aa] hover:text-white"
          )}
          onClick={() => onChange(tab.id)}
        >
          <span className="text-lg">{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e5ff]" 
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}