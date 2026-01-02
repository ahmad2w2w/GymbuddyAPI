# GymBuddy 💪

Een mobiele app om trainingsmaatjes te vinden! Match met mensen op basis van locatie, trainingsdoelen, niveau en beschikbaarheid.

## Features

### Core Features
- 🔐 **Authenticatie**: Veilig registreren en inloggen met email/wachtwoord
- 👤 **Profielen**: Uitgebreide profielen met goals, niveau, gym, beschikbaarheid
- 💙 **Swipe Feed**: Swipe door profielen om te matchen (Tinder-style)
- 🗺️ **Nearby Map**: Bekijk training sessies in de buurt op een kaart
- 📅 **Sessies**: Maak en deel training sessies waar anderen aan kunnen deelnemen
- 💬 **Chat**: Chat met je matches om afspraken te maken
- 📊 **Compatibility Score**: Zie hoe goed je matcht met anderen

### Premium Features (Coming Soon)
- ⭐ Onbeperkt likes
- 👀 Zie wie jou heeft geliked
- 🚀 Boost je profiel
- 🔍 Geavanceerde filters

## Tech Stack

### Frontend (Mobile)
- **React Native** met **Expo** (SDK 52)
- **TypeScript**
- **expo-router** voor navigatie
- **react-native-paper** voor UI componenten
- **react-native-maps** voor kaartweergave
- **expo-location** voor locatieservices

### Backend (API)
- **Node.js** met **Express**
- **TypeScript**
- **Prisma** ORM
- **SQLite** database (makkelijk te upgraden naar PostgreSQL)
- **JWT** authenticatie
- **Zod** voor validatie

### Shared
- Gedeelde types en validators
- Constanten voor goals, levels, etc.

## Project Structuur

```
gymbuddy/
├── apps/
│   ├── api/                    # Express API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed data
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       ├── lib/            # Utilities
│   │       └── routes/         # API routes
│   │
│   └── mobile/                 # Expo React Native app
│       ├── app/                # expo-router pages
│       │   ├── (auth)/         # Auth screens
│       │   ├── (onboarding)/   # Onboarding wizard
│       │   └── (tabs)/         # Main app tabs
│       ├── lib/                # Utilities
│       └── assets/             # Images, icons
│
└── packages/
    └── shared/                 # Shared types & validators
        └── src/
            ├── types.ts
            ├── validators.ts
            └── constants.ts
```

## Getting Started

### Vereisten
- Node.js 18+
- npm of yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app op je telefoon (voor testen)

### Installatie

1. **Clone de repository**
```bash
git clone <repo-url>
cd gymbuddy
```

2. **Installeer dependencies**
```bash
npm install
```

3. **Setup de API**
```bash
cd apps/api

# Maak .env bestand
cp .env.example .env
# Of maak handmatig met:
# DATABASE_URL="file:./dev.db"
# JWT_SECRET="jouw-geheime-key"
# PORT=3001

# Genereer Prisma client
npx prisma generate

# Push schema naar database
npx prisma db push

# Seed de database met demo data
npm run db:seed
```

4. **Start de API**
```bash
# In apps/api
npm run dev
```

5. **Start de Mobile App**
```bash
# In een nieuwe terminal
cd apps/mobile

# Update de API URL in lib/api.ts
# Vervang 192.168.1.100 met jouw lokale IP adres

# Start Expo
npm start
# of
npx expo start
```

6. **Open op je telefoon**
- Scan de QR code met Expo Go (Android) of Camera (iOS)
- Of druk 'a' voor Android emulator / 'i' voor iOS simulator

### Demo Accounts

Na het seeden zijn deze accounts beschikbaar:

| Email | Wachtwoord | Type |
|-------|------------|------|
| jan@example.com | password123 | Normaal |
| lisa@example.com | password123 | Normaal |
| mark@example.com | password123 | Beginner |
| sophie@example.com | password123 | **Premium** |
| tom@example.com | password123 | Powerlifter |
| emma@example.com | password123 | Normaal |

## API Endpoints

### Auth
- `POST /auth/register` - Registreer nieuwe gebruiker
- `POST /auth/login` - Inloggen
- `GET /auth/me` - Haal huidige gebruiker op

### Users
- `GET /users/feed` - Haal profielen op voor swipen
- `GET /users/:id` - Haal specifiek profiel op
- `PATCH /users/me` - Update eigen profiel

### Swipes & Matches
- `POST /swipe/like` - Like een gebruiker
- `POST /swipe/pass` - Pass een gebruiker
- `GET /matches` - Haal alle matches op

### Sessions
- `POST /sessions` - Maak nieuwe sessie
- `GET /sessions/nearby` - Haal sessies in de buurt op
- `GET /sessions/mine` - Haal eigen sessies op
- `GET /sessions/:id` - Haal specifieke sessie op
- `POST /sessions/:id/request` - Vraag om mee te doen
- `POST /sessions/:id/handle-request` - Accepteer/weiger verzoek

### Chat
- `GET /matches/:id/messages` - Haal berichten op
- `POST /matches/:id/messages` - Stuur bericht

## Environment Variables

### API (.env)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
```

### Mobile
Update `EXPO_PUBLIC_API_URL` in `apps/mobile/lib/api.ts`:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3001';
```

## Deployment

### API (Railway/Render/Fly.io)

1. **Update database naar PostgreSQL**
```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Deploy naar Railway**
```bash
# Installeer Railway CLI
npm install -g @railway/cli

# Login en deploy
railway login
railway init
railway up
```

### Mobile (Expo/EAS)

1. **Installeer EAS CLI**
```bash
npm install -g eas-cli
```

2. **Build voor productie**
```bash
cd apps/mobile
eas build --platform all
```

3. **Submit naar stores**
```bash
eas submit --platform ios
eas submit --platform android
```

## Monetization Plan

### Freemium Model
- **Gratis**: 10 likes/dag, basis filters, chat
- **Premium (€9.99/maand)**:
  - Onbeperkt likes
  - Zie wie jou heeft geliked
  - Geavanceerde filters (zelfde gym, specifieke beschikbaarheid)
  - Boost functie
  - Prioriteit in feed

### Toekomstige Revenue Streams
- **Gym Partnerships**: Gyms kunnen featured sessies plaatsen
- **Affiliate**: Supplementen/sportkleding aanbevelingen
- **Ads**: Sportgerelateerde advertenties (pas in latere fase)

## Growth Strategy

### User Acquisition
1. **Referral Program**: Nodig 3 vrienden uit → 1 week premium gratis
2. **Gym Partnerships**: Posters/QR codes bij lokale gyms
3. **Social Media**: TikTok/Instagram content ("trainen met random gymbuddy")
4. **ASO**: Keywords optimalisatie ("gym buddy", "trainingsmaatje", "workout partner")
5. **Community**: Challenges per stad/regio

### Retention
1. **Streak System**: Badges voor regelmatig samen trainen
2. **Reliability Score**: Feedback na sessies
3. **Push Notifications**: Reminders voor geplande sessies
4. **Gamification**: XP, levels, achievements

## Safety Features

- 🚫 **Anti-dating guardrails**: Geen flirty prompts, sport-gerichte UX
- ⚠️ **Report systeem**: Report categorie voor ongepast/dating gedrag
- ✅ **Verificatie score**: Profiel compleetheid indicator
- 🔒 **Privacy**: Exacte locatie nooit gedeeld, alleen gym naam

## Roadmap

### MVP (Huidige versie)
- [x] Auth & profielen
- [x] Swipe feed met matching
- [x] Sessies & kaart view
- [x] Basic chat
- [x] Profiel compleetheid score

### v1.1
- [ ] Push notifications
- [ ] Realtime chat (WebSockets)
- [ ] Foto uploads
- [ ] Verificatie via gym check-in

### v1.2
- [ ] Premium subscriptions (in-app purchases)
- [ ] Boost functie
- [ ] Zie wie jou liked
- [ ] Geavanceerde filters

### v2.0
- [ ] Groep sessies
- [ ] Workout tracking integratie
- [ ] AI matching verbetering
- [ ] Trainer/Coach accounts

## Contributing

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/amazing-feature`)
3. Commit je changes (`git commit -m 'Add amazing feature'`)
4. Push naar de branch (`git push origin feature/amazing-feature`)
5. Open een Pull Request

## License

MIT License - zie [LICENSE](LICENSE) voor details.

---

Gemaakt met ❤️ voor de fitness community



