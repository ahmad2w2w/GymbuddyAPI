import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Users } from "lucide-react";
import type { User } from "@shared/schema";

interface UserCardProps {
  user: User;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
}

export default function UserCard({ user }: UserCardProps) {
  const calculateDistance = (lat: string, lon: string) => {
    // Mock distance calculation - in real app would use geolocation
    return "0.5 km away";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4 relative swipe-card">
      {/* User Photo */}
      <div 
        className="h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${user.profileImage})` }}
      >
        {/* Availability Indicator */}
        {user.availableNow && (
          <div className="absolute top-4 right-4 bg-fitness-green text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
            Available Now
          </div>
        )}
        
        {/* Quick Workout Tags */}
        <div className="absolute bottom-4 left-4 flex space-x-2">
          {user.preferredWorkouts.slice(0, 2).map((workout) => (
            <Badge 
              key={workout}
              className="bg-black bg-opacity-70 text-white text-xs"
            >
              {workout}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-fitness-dark">
            {user.name}, {user.age}
          </h3>
          <div className="flex items-center text-orange-500 text-sm">
            <Star className="w-4 h-4 mr-1" />
            <span>{user.rating}</span>
          </div>
        </div>
        
        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{calculateDistance(user.latitude || "0", user.longitude || "0")}</span>
          <span className="mx-2">•</span>
          <span>{user.experienceLevel}</span>
        </div>
        
        <p className="text-gray-700 text-sm mb-3">
          {user.bio || "Ready to crush some workouts together! 💪"}
        </p>
        
        {/* Workout Preferences */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fitness-dark">Preferred Time:</span>
            <span className="text-sm text-gray-600">
              {user.preferredTimeSlots?.join(', ') || 'Flexible'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fitness-dark">Workout Duration:</span>
            <span className="text-sm text-gray-600">
              {user.workoutDuration || '60 mins'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fitness-dark">Workout Buddy Count:</span>
            <span className="text-sm text-gray-600">
              {user.workoutCount} workouts
            </span>
          </div>
        </div>

        {/* Additional Workout Types */}
        {user.preferredWorkouts.length > 2 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {user.preferredWorkouts.slice(2).map((workout) => (
              <Badge key={workout} variant="outline" className="text-xs">
                {workout}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
