import { Link, useLocation } from "wouter";
import { Home, Heart, Calendar, User, MessageCircle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/notification-system";

interface EnhancedBottomNavigationProps {
  currentPage: "discover" | "matches" | "schedule" | "profile" | "invitations";
  pendingInvitations?: number;
}

export default function EnhancedBottomNavigation({ 
  currentPage, 
  pendingInvitations = 0 
}: EnhancedBottomNavigationProps) {
  const [location] = useLocation();
  const { unreadCount } = useNotifications();

  const navItems = [
    {
      id: "discover",
      label: "Ontdekken",
      icon: Home,
      path: "/",
      badge: null
    },
    {
      id: "invitations",
      label: "Uitnodigingen",
      icon: MessageCircle,
      path: "/invitations",
      badge: pendingInvitations > 0 ? pendingInvitations : null
    },
    {
      id: "matches",
      label: "Matches",
      icon: Heart,
      path: "/matches",
      badge: null
    },
    {
      id: "schedule",
      label: "Planning",
      icon: Calendar,
      path: "/schedule",
      badge: null
    },
    {
      id: "profile",
      label: "Profiel",
      icon: User,
      path: "/profile",
      badge: unreadCount > 0 ? unreadCount : null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg z-40">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || 
            (item.id === "discover" && location === "/") ||
            (item.path !== "/" && location === item.path);

          return (
            <Link key={item.id} href={item.path}>
              <div className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 relative",
                "min-w-[60px] group cursor-pointer",
                isActive 
                  ? "text-blue-600 bg-blue-50 scale-105" 
                  : "text-gray-600 hover:text-blue-500 hover:bg-gray-50"
              )}>
                <div className="relative">
                  <Icon className={cn(
                    "w-6 h-6 transition-all duration-200",
                    isActive && "scale-110"
                  )} />
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}