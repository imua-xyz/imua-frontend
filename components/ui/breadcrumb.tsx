// components/ui/breadcrumb.tsx - Updated with enhanced styling
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight size={14} className="mx-2 text-muted-foreground flex-shrink-0" />
            )}
            
            {item.href ? (
              <Link 
                href={item.href} 
                className="flex items-center px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                {index === 0 && !item.icon && <Home size={14} className="mr-1.5" />}
                {item.icon && <span className="mr-1.5">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="px-2 py-1 font-medium">
                {item.icon && <span className="mr-1.5">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}