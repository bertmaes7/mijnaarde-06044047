import { useOrganizationLogo } from "@/hooks/useOrganizationLogo";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function OrganizationLogo({ 
  size = "md", 
  className,
  showFallback = true 
}: OrganizationLogoProps) {
  const logoUrl = useOrganizationLogo();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Mijn Aarde Logo"
        className={cn(sizeClasses[size], "object-contain", className)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  if (showFallback) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-xl gradient-earth",
        sizeClasses[size],
        className
      )}>
        <Leaf className={cn(
          "text-primary-foreground",
          size === "sm" ? "h-3 w-3" : size === "md" ? "h-5 w-5" : "h-8 w-8"
        )} />
      </div>
    );
  }

  return null;
}
