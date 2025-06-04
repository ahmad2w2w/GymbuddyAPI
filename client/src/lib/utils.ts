import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  }
  return `${distance.toFixed(1)}km away`;
}

export function getTimeSlotLabel(timeSlot: string): string {
  const timeSlots: Record<string, string> = {
    'Early Morning': '5:00 - 8:00 AM',
    'Morning': '8:00 - 11:00 AM',
    'Afternoon': '12:00 - 5:00 PM',
    'Evening': '5:00 - 8:00 PM',
    'Late Evening': '8:00 - 11:00 PM',
  };
  
  return timeSlots[timeSlot] || timeSlot;
}

export function getWorkoutEmoji(workoutType: string): string {
  const emojis: Record<string, string> = {
    'Strength': '💪',
    'Cardio': '🏃',
    'Yoga': '🧘',
    'Swimming': '🏊',
    'Running': '🏃',
    'Cycling': '🚴',
    'Boxing': '🥊',
    'Outdoor': '🌲',
  };
  
  return emojis[workoutType] || '🏋️';
}
