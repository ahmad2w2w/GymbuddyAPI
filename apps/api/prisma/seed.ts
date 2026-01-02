import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.pass.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create demo users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'jan@example.com',
        passwordHash,
        name: 'Jan de Vries',
        avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop&crop=face',
        bio: 'Enthousiaste lifter, altijd op zoek naar een trainingsmaatje voor zware compound lifts.',
        ageRange: '25-34',
        gymName: 'Basic-Fit Amsterdam Centrum',
        gymAddress: 'Damrak 1, Amsterdam',
        lat: 52.3738,
        lng: 4.8910,
        goals: JSON.stringify(['muscle_building', 'powerlifting']),
        level: 'intermediate',
        trainingStyle: 'push_pull_legs',
        availability: JSON.stringify([
          { day: 'monday', timeSlots: ['evening'] },
          { day: 'wednesday', timeSlots: ['evening'] },
          { day: 'friday', timeSlots: ['evening'] },
          { day: 'saturday', timeSlots: ['morning', 'afternoon'] }
        ]),
        interestTags: JSON.stringify(['bench_press', 'squat', 'deadlift']),
        verificationScore: 85,
        likesRemaining: 10
      }
    }),
    prisma.user.create({
      data: {
        email: 'lisa@example.com',
        passwordHash,
        name: 'Lisa Bakker',
        avatarUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop&crop=face',
        bio: 'CrossFit addict en runner. Zoek iemand voor HIIT sessies en functionele training.',
        ageRange: '25-34',
        gymName: 'CrossFit Amsterdam',
        gymAddress: 'Wibautstraat 150, Amsterdam',
        lat: 52.3551,
        lng: 4.9127,
        goals: JSON.stringify(['conditioning', 'crossfit', 'weight_loss']),
        level: 'advanced',
        trainingStyle: 'full_body',
        availability: JSON.stringify([
          { day: 'tuesday', timeSlots: ['early_morning'] },
          { day: 'thursday', timeSlots: ['early_morning'] },
          { day: 'saturday', timeSlots: ['morning'] }
        ]),
        interestTags: JSON.stringify(['olympic_lifts', 'running', 'calisthenics']),
        verificationScore: 92,
        likesRemaining: 10
      }
    }),
    prisma.user.create({
      data: {
        email: 'mark@example.com',
        passwordHash,
        name: 'Mark Jansen',
        avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&h=400&fit=crop&crop=face',
        bio: 'Beginner maar super gemotiveerd! Zoek een buddy om de basics te leren.',
        ageRange: '18-24',
        gymName: 'Basic-Fit Amsterdam Centrum',
        gymAddress: 'Damrak 1, Amsterdam',
        lat: 52.3738,
        lng: 4.8910,
        goals: JSON.stringify(['muscle_building', 'general_fitness']),
        level: 'beginner',
        trainingStyle: 'full_body',
        availability: JSON.stringify([
          { day: 'monday', timeSlots: ['afternoon', 'evening'] },
          { day: 'tuesday', timeSlots: ['afternoon', 'evening'] },
          { day: 'thursday', timeSlots: ['afternoon', 'evening'] }
        ]),
        interestTags: JSON.stringify(['bench_press', 'arms', 'chest']),
        verificationScore: 60,
        likesRemaining: 10
      }
    }),
    prisma.user.create({
      data: {
        email: 'sophie@example.com',
        passwordHash,
        name: 'Sophie van Dam',
        avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&h=400&fit=crop&crop=face',
        bio: 'Bodybuilding competitor, 5 jaar ervaring. Kan ook tips geven aan beginners!',
        ageRange: '25-34',
        gymName: 'Sportcity Amsterdam',
        gymAddress: 'Amstelveenseweg 200, Amsterdam',
        lat: 52.3492,
        lng: 4.8649,
        goals: JSON.stringify(['bodybuilding', 'muscle_building']),
        level: 'advanced',
        trainingStyle: 'bro_split',
        availability: JSON.stringify([
          { day: 'monday', timeSlots: ['morning'] },
          { day: 'tuesday', timeSlots: ['morning'] },
          { day: 'wednesday', timeSlots: ['morning'] },
          { day: 'thursday', timeSlots: ['morning'] },
          { day: 'friday', timeSlots: ['morning'] }
        ]),
        interestTags: JSON.stringify(['shoulders', 'back', 'chest', 'arms']),
        verificationScore: 95,
        isPremium: true,
        likesRemaining: 999
      }
    }),
    prisma.user.create({
      data: {
        email: 'tom@example.com',
        passwordHash,
        name: 'Tom Hendriks',
        avatarUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=400&fit=crop&crop=face',
        bio: 'Powerlifter, focus op de big 3. Zoek een spotter voor heavy singles.',
        ageRange: '35-44',
        gymName: 'Basic-Fit Amsterdam Centrum',
        gymAddress: 'Damrak 1, Amsterdam',
        lat: 52.3738,
        lng: 4.8910,
        goals: JSON.stringify(['powerlifting']),
        level: 'advanced',
        trainingStyle: 'custom',
        availability: JSON.stringify([
          { day: 'monday', timeSlots: ['late_evening'] },
          { day: 'wednesday', timeSlots: ['late_evening'] },
          { day: 'friday', timeSlots: ['late_evening'] }
        ]),
        interestTags: JSON.stringify(['bench_press', 'squat', 'deadlift']),
        verificationScore: 88,
        likesRemaining: 10
      }
    }),
    prisma.user.create({
      data: {
        email: 'emma@example.com',
        passwordHash,
        name: 'Emma de Groot',
        avatarUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop&crop=face',
        bio: 'Yoga instructor, ook fan van strength training. Balanced approach!',
        ageRange: '25-34',
        gymName: 'Sportcity Amsterdam',
        gymAddress: 'Amstelveenseweg 200, Amsterdam',
        lat: 52.3492,
        lng: 4.8649,
        goals: JSON.stringify(['general_fitness', 'conditioning']),
        level: 'intermediate',
        trainingStyle: 'upper_lower',
        availability: JSON.stringify([
          { day: 'tuesday', timeSlots: ['morning', 'afternoon'] },
          { day: 'thursday', timeSlots: ['morning', 'afternoon'] },
          { day: 'sunday', timeSlots: ['morning'] }
        ]),
        interestTags: JSON.stringify(['yoga', 'stretching', 'core']),
        verificationScore: 75,
        likesRemaining: 10
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create demo sessions
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const sessions = await Promise.all([
    prisma.session.create({
      data: {
        ownerId: users[0].id, // Jan
        title: 'Push Day - Heavy Bench',
        workoutType: 'push',
        intensity: 'high',
        gymName: 'Basic-Fit Amsterdam Centrum',
        gymAddress: 'Damrak 1, Amsterdam',
        lat: 52.3738,
        lng: 4.8910,
        startTime: new Date(tomorrow.setHours(19, 0, 0, 0)),
        durationMinutes: 90,
        slots: 2,
        slotsAvailable: 1,
        notes: 'Focus op bench press, zoek een spotter voor heavy sets!'
      }
    }),
    prisma.session.create({
      data: {
        ownerId: users[1].id, // Lisa
        title: 'HIIT Circuit Training',
        workoutType: 'hiit',
        intensity: 'high',
        gymName: 'CrossFit Amsterdam',
        gymAddress: 'Wibautstraat 150, Amsterdam',
        lat: 52.3551,
        lng: 4.9127,
        startTime: new Date(tomorrow.setHours(7, 0, 0, 0)),
        durationMinutes: 60,
        slots: 3,
        slotsAvailable: 2,
        notes: 'Intense circuit, breng een handdoek!'
      }
    }),
    prisma.session.create({
      data: {
        ownerId: users[4].id, // Tom
        title: 'Squat Day - Max Attempt',
        workoutType: 'strength',
        intensity: 'high',
        gymName: 'Basic-Fit Amsterdam Centrum',
        gymAddress: 'Damrak 1, Amsterdam',
        lat: 52.3738,
        lng: 4.8910,
        startTime: new Date(dayAfter.setHours(21, 0, 0, 0)),
        durationMinutes: 120,
        slots: 1,
        slotsAvailable: 1,
        notes: 'Ga voor een PR, ervaren spotter nodig!'
      }
    }),
    prisma.session.create({
      data: {
        ownerId: users[3].id, // Sophie
        title: 'Back & Biceps',
        workoutType: 'pull',
        intensity: 'medium',
        gymName: 'Sportcity Amsterdam',
        gymAddress: 'Amstelveenseweg 200, Amsterdam',
        lat: 52.3492,
        lng: 4.8649,
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        durationMinutes: 75,
        slots: 2,
        slotsAvailable: 2,
        notes: 'Relaxte sessie, beginners welkom!'
      }
    })
  ]);

  console.log(`✅ Created ${sessions.length} sessions`);

  // Create some likes and matches
  // Jan likes Lisa, Lisa likes Jan -> Match!
  await prisma.like.create({
    data: { fromUserId: users[0].id, toUserId: users[1].id }
  });
  await prisma.like.create({
    data: { fromUserId: users[1].id, toUserId: users[0].id }
  });
  
  const match1 = await prisma.match.create({
    data: { userAId: users[0].id, userBId: users[1].id }
  });

  // Add some messages to the match
  await prisma.message.createMany({
    data: [
      { matchId: match1.id, senderId: users[0].id, text: 'Hey Lisa! Zin om een keer samen te trainen?' },
      { matchId: match1.id, senderId: users[1].id, text: 'Hoi Jan! Ja lijkt me leuk. Wanneer heb je tijd?' },
      { matchId: match1.id, senderId: users[0].id, text: 'Vrijdag avond? Ik train meestal in Basic-Fit Centrum.' },
    ]
  });

  console.log('✅ Created matches and messages');

  // Mark likes Tom
  await prisma.like.create({
    data: { fromUserId: users[2].id, toUserId: users[4].id }
  });

  // Sophie likes Emma, Emma likes Sophie -> Match!
  await prisma.like.create({
    data: { fromUserId: users[3].id, toUserId: users[5].id }
  });
  await prisma.like.create({
    data: { fromUserId: users[5].id, toUserId: users[3].id }
  });
  
  await prisma.match.create({
    data: { userAId: users[3].id, userBId: users[5].id }
  });

  console.log('✅ Created likes');

  // Create a join request
  await prisma.joinRequest.create({
    data: {
      sessionId: sessions[0].id, // Jan's push session
      requesterId: users[2].id,  // Mark wants to join
      status: 'pending'
    }
  });

  console.log('✅ Created join requests');
  console.log('🎉 Seeding completed!');
  console.log('\nDemo accounts:');
  console.log('  Email: jan@example.com / Password: password123');
  console.log('  Email: lisa@example.com / Password: password123');
  console.log('  Email: mark@example.com / Password: password123');
  console.log('  Email: sophie@example.com / Password: password123 (Premium)');
  console.log('  Email: tom@example.com / Password: password123');
  console.log('  Email: emma@example.com / Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



