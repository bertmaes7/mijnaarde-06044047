import { Link, useLocation } from "react-router-dom";
import { Users, Building2, LayoutDashboard, Leaf, Wallet, TrendingUp, TrendingDown, FileText, LogOut, Mail, Settings, FileCode, Send, Calendar, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Leden", icon: Users },
  { href: "/companies", label: "Bedrijven", icon: Building2 },
  { href: "/events", label: "Events", icon: Calendar },
];

const financeSubItems = [
  { href: "/finance", label: "Overzicht", icon: Wallet },
  { href: "/finance/income", label: "Inkomsten", icon: TrendingUp },
  { href: "/finance/expenses", label: "Uitgaven", icon: TrendingDown },
  { href: "/finance/invoices", label: "Uitgaande Facturen", icon: FileText },
];

const mailingSubItems = [
  { href: "/mailing/assets", label: "Assets & Gegevens", icon: Settings },
  { href: "/mailing/templates", label: "Templates", icon: FileCode },
  { href: "/mailing", label: "Mailings", icon: Send },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-earth">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-sidebar-foreground">
              Mijn Aarde
            </h1>
            <p className="text-xs text-muted-foreground">Beheerder</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {mainNavItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {/* Mailing Section - under Bedrijven */}
          <MailingNav location={location} />

          {/* Finance Section */}
          <FinanceNav location={location} />
          
          {/* Tools - at the bottom */}
          <ToolsNav location={location} />
        </nav>

        {/* User & Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          {user && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate flex-1">
                {user.email}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSignOut}
                title="Uitloggen"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            © 2024 Mijn Aarde vzw
          </p>
        </div>
      </div>
    </aside>
  );
}

function FinanceNav({ location }: { location: ReturnType<typeof useLocation> }) {
  const isFinanceActive = location.pathname.startsWith("/finance");
  const [isOpen, setIsOpen] = useState(isFinanceActive);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isFinanceActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5" />
          Financieel
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1 pl-4">
        {financeSubItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MailingNav({ location }: { location: ReturnType<typeof useLocation> }) {
  const isMailingActive = location.pathname.startsWith("/mailing");
  const [isOpen, setIsOpen] = useState(isMailingActive);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isMailingActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" />
          Mailing
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1 pl-4">
        {mailingSubItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolsNav({ location }: { location: ReturnType<typeof useLocation> }) {
  const isActive = location.pathname === "/tools";

  return (
    <Link
      to="/tools"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Wrench className="h-5 w-5" />
      Tools
    </Link>
  );
}
