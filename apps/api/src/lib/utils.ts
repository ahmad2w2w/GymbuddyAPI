import type { User } from '@prisma/client';

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate compatibility score between two users
export function calculateCompatibility(user1: User, user2: User): number {
  let score = 0;
  let factors = 0;

  const goals1 = JSON.parse(user1.goals || '[]') as string[];
  const goals2 = JSON.parse(user2.goals || '[]') as string[];
  const tags1 = JSON.parse(user1.interestTags || '[]') as string[];
  const tags2 = JSON.parse(user2.interestTags || '[]') as string[];
  const avail1 = JSON.parse(user1.availability || '[]') as { day: string; timeSlots: string[] }[];
  const avail2 = JSON.parse(user2.availability || '[]') as { day: string; timeSlots: string[] }[];

  // Same gym (big bonus)
  if (user1.gymName && user2.gymName && 
      user1.gymName.toLowerCase() === user2.gymName.toLowerCase()) {
    score += 30;
  }
  factors += 30;

  // Goal overlap
  const goalOverlap = goals1.filter(g => goals2.includes(g)).length;
  const maxGoals = Math.max(goals1.length, goals2.length, 1);
  score += (goalOverlap / maxGoals) * 25;
  factors += 25;

  // Level compatibility (same or adjacent level is good)
  if (user1.level && user2.level) {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const diff = Math.abs(levels.indexOf(user1.level) - levels.indexOf(user2.level));
    if (diff === 0) score += 15;
    else if (diff === 1) score += 10;
  }
  factors += 15;

  // Training style match
  if (user1.trainingStyle && user2.trainingStyle && 
      user1.trainingStyle === user2.trainingStyle) {
    score += 10;
  }
  factors += 10;

  // Interest tags overlap
  const tagOverlap = tags1.filter(t => tags2.includes(t)).length;
  const maxTags = Math.max(tags1.length, tags2.length, 1);
  score += (tagOverlap / maxTags) * 10;
  factors += 10;

  // Availability overlap
  const availOverlap = countAvailabilityOverlap(avail1, avail2);
  score += Math.min(availOverlap * 2, 10); // Max 10 points
  factors += 10;

  return Math.round((score / factors) * 100);
}

function countAvailabilityOverlap(
  avail1: { day: string; timeSlots: string[] }[],
  avail2: { day: string; timeSlots: string[] }[]
): number {
  let overlap = 0;
  
  for (const a1 of avail1) {
    const a2 = avail2.find(a => a.day === a1.day);
    if (a2) {
      const slotOverlap = a1.timeSlots.filter(s => a2.timeSlots.includes(s)).length;
      overlap += slotOverlap;
    }
  }
  
  return overlap;
}

// Transform user from DB to public profile
export function toUserProfile(user: User, currentUser?: User) {
  let distance = null;
  
  if (currentUser && currentUser.lat && currentUser.lng && user.lat && user.lng) {
    distance = Math.round(calculateDistance(
      currentUser.lat, currentUser.lng,
      user.lat, user.lng
    ) * 10) / 10;
  }

  let compatibilityScore = 0;
  if (currentUser) {
    compatibilityScore = calculateCompatibility(currentUser, user);
  }

  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    ageRange: user.ageRange,
    gymName: user.gymName,
    distance,
    goals: JSON.parse(user.goals || '[]'),
    level: user.level,
    trainingStyle: user.trainingStyle,
    availability: JSON.parse(user.availability || '[]'),
    interestTags: JSON.parse(user.interestTags || '[]'),
    verificationScore: user.verificationScore,
    compatibilityScore
  };
}

// Calculate verification score based on profile completeness
export function calculateVerificationScore(user: User): number {
  let score = 0;
  
  if (user.name) score += 10;
  if (user.bio && user.bio.length >= 20) score += 15;
  if (user.avatarUrl) score += 15;
  if (user.ageRange) score += 5;
  if (user.gymName) score += 15;
  if (user.lat && user.lng) score += 10;
  
  const goals = JSON.parse(user.goals || '[]');
  if (goals.length > 0) score += 10;
  
  if (user.level) score += 5;
  if (user.trainingStyle) score += 5;
  
  const availability = JSON.parse(user.availability || '[]');
  if (availability.length > 0) score += 5;
  
  const tags = JSON.parse(user.interestTags || '[]');
  if (tags.length > 0) score += 5;
  
  return Math.min(score, 100);
}
