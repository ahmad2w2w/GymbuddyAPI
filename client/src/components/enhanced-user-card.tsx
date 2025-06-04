import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  X, 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Zap,
  Award,
  Calendar,
  MessageCircle
} from "lucide-react";
import { getWorkoutEmoji, formatDistance, getTimeSlotLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface EnhancedUserCardProps {
  user: User;
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  onMessage?: () => void;
  distance?: number;
  showActions?: boolean;
  className?: string;
}

const getExperienceBadge = (level: string | null) => {
  if (!level) return null;
  
  const badges = {
    beginner: { label: "Beginner", color: "bg-green-100 text-green-800", icon: "🌱" },
    intermediate: { label: "Gevorderd", color: "bg-blue-100 text-blue-800", icon: "🎯" },
    advanced: { label: "Expert", color: "bg-purple-100 text-purple-800", icon: "🏆" },
    professional: { label: "Pro", color: "bg-orange-100 text-orange-800", icon: "⭐" }
  };
  
  return badges[level as keyof typeof badges] || badges.beginner;
};

export default function EnhancedUserCard({ 
  user, 
  onLike, 
  onPass, 
  onSuperLike, 
  onMessage,
  distance,
  showActions = true,
  className 
}: EnhancedUserCardProps) {
  const experienceBadge = getExperienceBadge(user.experienceLevel);
  const age = user.age ? `${user.age} jaar` : '';

  return (
    <Card className={cn(
      "w-full max-w-sm mx-auto overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group",
      "bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg",
      className
    )}>
      {/* Profile Image Section */}
      <div className="relative">
        <div className="aspect-[4/5] relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.name || 'User'} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
              <span className="text-6xl font-bold text-white">
                {user.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          
          {/* Status Indicators */}
          <div className="absolute top-4 left-4 flex gap-2">
            {user.availableNow && (
              <Badge className="bg-green-500 text-white shadow-lg">
                <Zap className="w-3 h-3 mr-1" />
                Nu beschikbaar
              </Badge>
            )}
            {distance && (
              <Badge variant="secondary" className="bg-black/20 text-white backdrop-blur-sm">
                <MapPin className="w-3 h-3 mr-1" />
                {formatDistance(distance)}
              </Badge>
            )}
          </div>
          
          {/* Experience Badge */}
          {experienceBadge && (
            <div className="absolute top-4 right-4">
              <Badge className={cn("shadow-lg", experienceBadge.color)}>
                <span className="mr-1">{experienceBadge.icon}</span>
                {experienceBadge.label}
              </Badge>
            </div>
          )}
          
          {/* Super Like Button */}
          {showActions && onSuperLike && (
            <Button
              onClick={onSuperLike}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-xl"
              size="sm"
            >
              <Star className="w-4 h-4 mr-1" />
              Super Like
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* User Info Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
              {age && <span className="text-lg text-gray-600">{age}</span>}
            </div>
            {user.location && (
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                {user.location}
              </div>
            )}
          </div>
          
          <Avatar className="w-12 h-12 ring-2 ring-white shadow-md">
            <AvatarImage src={user.profileImage || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {user.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {user.bio}
          </p>
        )}

        {/* Workout Preferences */}
        <div className="space-y-3">
          {user.workoutTypes && (
            <div className="flex flex-wrap gap-2">
              {user.workoutTypes.split(',').slice(0, 3).map((type, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <span className="mr-1">{getWorkoutEmoji(type.trim())}</span>
                  {type.trim()}
                </Badge>
              ))}
              {user.workoutTypes.split(',').length > 3 && (
                <Badge variant="outline" className="text-gray-600">
                  +{user.workoutTypes.split(',').length - 3} meer
                </Badge>
              )}
            </div>
          )}

          {/* Time Preferences */}
          {user.preferredTime && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>Voorkeur: {getTimeSlotLabel(user.preferredTime)}</span>
            </div>
          )}

          {/* Fitness Goals */}
          {user.fitnessGoals && (
            <div className="flex items-center text-sm text-gray-600">
              <Award className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">{user.fitnessGoals}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-3 pt-2">
            {onPass && (
              <Button
                onClick={onPass}
                variant="outline"
                className="flex-1 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200"
              >
                <X className="w-4 h-4 mr-2" />
                Slaan over
              </Button>
            )}
            
            {onMessage && (
              <Button
                onClick={onMessage}
                variant="outline"
                className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Bericht
              </Button>
            )}
            
            {onLike && (
              <Button
                onClick={onLike}
                className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Heart className="w-4 h-4 mr-2" />
                Uitnodigen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}