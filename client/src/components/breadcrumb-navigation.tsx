import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavigationProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const getDefaultBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const pathMap: Record<string, BreadcrumbItem[]> = {
    "/": [{ label: "Home", path: "/", icon: <Home className="w-4 h-4" /> }],
    "/matches": [
      { label: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
      { label: "Matches", path: "/matches" }
    ],
    "/invitations": [
      { label: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
      { label: "Uitnodigingen", path: "/invitations" }
    ],
    "/schedule": [
      { label: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
      { label: "Planning", path: "/schedule" }
    ],
    "/profile": [
      { label: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
      { label: "Profiel", path: "/profile" }
    ],
    "/profile-setup": [
      { label: "Home", path: "/", icon: <Home className="w-4 h-4" /> },
      { label: "Profiel instellen", path: "/profile-setup" }
    ]
  };

  return pathMap[pathname] || [{ label: "Home", path: "/", icon: <Home className="w-4 h-4" /> }];
};

export default function BreadcrumbNavigation({ items, className }: BreadcrumbNavigationProps) {
  const [location] = useLocation();
  const breadcrumbs = items || getDefaultBreadcrumbs(location);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className={cn("flex items-center space-x-2 text-sm text-gray-600 px-4 py-2", className)}>
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="flex items-center gap-2 text-gray-900 font-medium">
              {item.icon}
              {item.label}
            </span>
          ) : (
            <Link href={item.path}>
              <a className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                {item.icon}
                {item.label}
              </a>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}