import { Button } from "@/components/ui/button";
import { Dumbbell, MessageCircle, Calendar, User, Badge as BadgeIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

interface BottomNavigationProps {
  currentPage: "discover" | "matches" | "schedule" | "profile";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    {
      id: "discover",
      label: "Discover",
      icon: Dumbbell,
      path: "/",
      hasNotification: false,
    },
    {
      id: "matches",
      label: "Matches",
      icon: MessageCircle,
      path: "/matches",
      hasNotification: true,
      notificationCount: 3,
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: Calendar,
      path: "/schedule",
      hasNotification: false,
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      path: "/profile",
      hasNotification: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 bottom-nav">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Link key={item.id} href={item.path}>
              <Button
                variant="ghost"
                className={`flex flex-col items-center py-2 px-4 relative ${
                  isActive 
                    ? "text-fitness-blue" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
                {item.hasNotification && item.notificationCount && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-fitness-orange rounded-full text-white text-xs flex items-center justify-center">
                    {item.notificationCount}
                  </div>
                )}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
