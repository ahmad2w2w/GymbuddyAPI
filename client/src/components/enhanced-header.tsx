import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Filter, Menu, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/components/notification-system";
import NotificationSystem from "@/components/notification-system";
import { cn } from "@/lib/utils";

interface EnhancedHeaderProps {
  title: string;
  showSearch?: boolean;
  showFilter?: boolean;
  onSearchClick?: () => void;
  onFilterClick?: () => void;
  className?: string;
}

export default function EnhancedHeader({
  title,
  showSearch = false,
  showFilter = false,
  onSearchClick,
  onFilterClick,
  className
}: EnhancedHeaderProps) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className={cn(
        "sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm",
        className
      )}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">Vind je workout buddy</p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {showSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSearchClick}
                className="rounded-full"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
            
            {showFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFilterClick}
                className="rounded-full"
              >
                <Filter className="w-5 h-5" />
              </Button>
            )}

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="rounded-full relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* User Avatar */}
            <Avatar className="w-8 h-8 ring-2 ring-white shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {user?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Notification System */}
      <NotificationSystem
        isVisible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}