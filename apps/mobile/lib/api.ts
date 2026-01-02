import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.187:3001';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
    } catch (e) {
      console.error('Failed to load token:', e);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      AsyncStorage.setItem('auth_token', token);
    } else {
      AsyncStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async register(email: string, password: string, name: string) {
    const result = await this.request<{
      success: boolean;
      data: { user: User; tokens: { accessToken: string } };
    }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    if (result.success) {
      this.setToken(result.data.tokens.accessToken);
    }
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{
      success: boolean;
      data: { user: User; tokens: { accessToken: string } };
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (result.success) {
      this.setToken(result.data.tokens.accessToken);
    }
    return result;
  }

  async getMe() {
    return this.request<{ success: boolean; data: User }>('/auth/me');
  }

  // Users
  async getFeed(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    goals?: string[];
    level?: string;
    sameGymOnly?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params.lat) searchParams.set('lat', params.lat.toString());
    if (params.lng) searchParams.set('lng', params.lng.toString());
    if (params.radiusKm) searchParams.set('radiusKm', params.radiusKm.toString());
    if (params.goals?.length) searchParams.set('goals', params.goals.join(','));
    if (params.level) searchParams.set('level', params.level);
    if (params.sameGymOnly) searchParams.set('sameGymOnly', 'true');

    return this.request<{
      success: boolean;
      data: { items: UserProfile[]; total: number; likesRemaining: number };
    }>(`/users/feed?${searchParams.toString()}`);
  }

  async getUser(id: string) {
    return this.request<{ success: boolean; data: UserProfile }>(`/users/${id}`);
  }

  async updateProfile(data: Partial<User>) {
    return this.request<{ success: boolean; data: User }>('/users/me', {
      method: 'PATCH',
      body: data,
    });
  }

  // Swipes
  async like(toUserId: string) {
    return this.request<{
      success: boolean;
      data: {
        liked: boolean;
        isMatch: boolean;
        match: { id: string; otherUser: UserProfile } | null;
        likesRemaining: number;
      };
    }>('/swipe/like', {
      method: 'POST',
      body: { toUserId },
    });
  }

  async pass(toUserId: string) {
    return this.request<{ success: boolean; data: { passed: boolean } }>('/swipe/pass', {
      method: 'POST',
      body: { toUserId },
    });
  }

  // Matches
  async getMatches() {
    return this.request<{ success: boolean; data: Match[] }>('/matches');
  }

  async getMessages(matchId: string) {
    return this.request<{
      success: boolean;
      data: { match: Match; messages: Message[] };
    }>(`/matches/${matchId}/messages`);
  }

  async sendMessage(matchId: string, text: string) {
    return this.request<{ success: boolean; data: Message }>(`/matches/${matchId}/messages`, {
      method: 'POST',
      body: { text },
    });
  }

  // Sessions
  async createSession(data: CreateSessionInput) {
    return this.request<{ success: boolean; data: Session }>('/sessions', {
      method: 'POST',
      body: data,
    });
  }

  async getNearbySessions(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    timeFrom?: string;
    timeTo?: string;
    workoutType?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.lat) searchParams.set('lat', params.lat.toString());
    if (params.lng) searchParams.set('lng', params.lng.toString());
    if (params.radiusKm) searchParams.set('radiusKm', params.radiusKm.toString());
    if (params.timeFrom) searchParams.set('timeFrom', params.timeFrom);
    if (params.timeTo) searchParams.set('timeTo', params.timeTo);
    if (params.workoutType) searchParams.set('workoutType', params.workoutType);

    return this.request<{ success: boolean; data: Session[] }>(
      `/sessions/nearby?${searchParams.toString()}`
    );
  }

  async getMySessions() {
    return this.request<{ success: boolean; data: Session[] }>('/sessions/mine');
  }

  async getSession(id: string) {
    return this.request<{ success: boolean; data: Session }>(`/sessions/${id}`);
  }

  async requestJoinSession(sessionId: string) {
    return this.request<{ success: boolean; data: JoinRequest }>(`/sessions/${sessionId}/request`, {
      method: 'POST',
    });
  }

  async handleJoinRequest(sessionId: string, requestId: string, action: 'accept' | 'decline') {
    return this.request<{ success: boolean; data: { requestId: string; status: string } }>(
      `/sessions/${sessionId}/handle-request`,
      {
        method: 'POST',
        body: { requestId, action },
      }
    );
  }

  // Avatar
  async uploadAvatar(imageBase64: string) {
    return this.request<{ success: boolean; data: { avatarUrl: string } }>('/users/me/avatar', {
      method: 'POST',
      body: { imageBase64 },
    });
  }

  // Block & Report
  async blockUser(userId: string) {
    return this.request<{ success: boolean; data: { blocked: boolean; message: string } }>(
      `/users/${userId}/block`,
      { method: 'POST' }
    );
  }

  async reportUser(userId: string, reason: string, details?: string) {
    return this.request<{ success: boolean; data: { reported: boolean; message: string } }>(
      `/users/${userId}/report`,
      { method: 'POST', body: { reason, details } }
    );
  }

  // Password
  async forgotPassword(email: string) {
    return this.request<{ success: boolean; data: { message: string; devCode?: string } }>(
      '/auth/forgot-password',
      { method: 'POST', body: { email } }
    );
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return this.request<{ success: boolean; data: { message: string } }>(
      '/auth/reset-password',
      { method: 'POST', body: { email, code, newPassword } }
    );
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; data: { message: string } }>(
      '/auth/change-password',
      { method: 'POST', body: { currentPassword, newPassword } }
    );
  }

  // Account
  async deleteAccount(password: string) {
    return this.request<{ success: boolean; data: { message: string } }>(
      '/auth/account',
      { method: 'DELETE', body: { password } }
    );
  }

  // Push Notifications
  async registerPushToken(token: string, platform: 'ios' | 'android') {
    return this.request<{ success: boolean; data: { registered: boolean } }>(
      '/notifications/token',
      { method: 'POST', body: { token, platform } }
    );
  }

  async removePushToken(token: string) {
    return this.request<{ success: boolean; data: { removed: boolean } }>(
      '/notifications/token',
      { method: 'DELETE', body: { token } }
    );
  }
}

export const api = new ApiClient(API_URL);

// Types (simplified for mobile)
export interface User {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  ageRange: string | null;
  gymName: string | null;
  gymAddress: string | null;
  lat: number | null;
  lng: number | null;
  preferredRadius: number;
  goals: string[];
  level: string | null;
  trainingStyle: string | null;
  availability: { day: string; timeSlots: string[] }[];
  interestTags: string[];
  verificationScore: number;
  isPremium: boolean;
  likesRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  ageRange: string | null;
  gymName: string | null;
  distance: number | null;
  goals: string[];
  level: string | null;
  trainingStyle: string | null;
  availability: { day: string; timeSlots: string[] }[];
  interestTags: string[];
  verificationScore: number;
  compatibilityScore: number;
}

export interface Match {
  id: string;
  otherUser: UserProfile;
  lastMessage: Message | null;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Session {
  id: string;
  ownerId: string;
  owner?: UserProfile;
  title: string;
  workoutType: string;
  intensity: string;
  gymName: string;
  gymAddress: string | null;
  lat: number;
  lng: number;
  startTime: string;
  durationMinutes: number;
  slots: number;
  slotsAvailable: number;
  notes: string | null;
  distance?: number;
  createdAt: string;
  joinRequests?: JoinRequest[];
  myRequestStatus?: string | null;
}

export interface JoinRequest {
  id: string;
  sessionId: string;
  requesterId: string;
  requester?: UserProfile;
  status: string;
  createdAt: string;
}

export interface CreateSessionInput {
  title: string;
  workoutType: string;
  intensity: string;
  gymName: string;
  gymAddress?: string | null;
  lat: number;
  lng: number;
  startTime: string;
  durationMinutes: number;
  slots: number;
  notes?: string | null;
}
