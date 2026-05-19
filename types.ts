
export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface MeetupDetails {
  title: string;
  activity: string;
  feeType: string;
  feeAmount?: string;
  maxGuests?: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  meetingUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  jobRole?: string;
  instagramHandle?: string;
  interests: string[];
  bio?: string;
  createdAt: number;
  lastLocation?: Location;
  friends?: string[];
  incomingRequests?: string[];
  outgoingRequests?: string[];
  friendRequestMessages?: Record<string, string>; // Map of uid -> message
  blockedUsers?: string[];
  passedUsers?: string[];
  dob?: string;

  isDiscoverable?: boolean;
  discoveryRadius?: number; // in km
  thatsMePhotos?: string[];
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  relation?: 'self' | 'friend' | 'public';
  distanceBand?: string;
  locationAccuracyMeters?: number;
}

export interface Comment {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

export interface Post {
  _id?: string;
  uid: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageURL?: string;
  likes: number;
  likedBy?: string[];
  comments?: Comment[];
  createdAt: number;
  location?: Location;
  type?: 'regular' | 'meetup';
  meetupDetails?: MeetupDetails;
  attendees?: string[]; // UIDs of accepted guests
  pendingRequests?: string[]; // UIDs of pending requests
}

export interface Notification {
  _id: string;
  type: 'friend_request' | 'friend_accept' | 'like' | 'comment' | 'meetup_request' | 'meetup_accept' | 'friend_post' | 'friend_event' | 'new_event' | 'room_message';
  fromUid: string;
  fromName: string;
  fromPhoto: string;
  toUid: string;
  postId?: string;
  groupId?: string;
  message?: string;
  read: boolean;
  createdAt: number;
}

export interface Message {
  _id: string;
  fromUid: string;
  toUid?: string; // Optional for group chat
  groupId?: string; // Post ID for meetup group chats
  groupTitle?: string; // Title of the meetup
  text: string;
  read?: boolean;
  createdAt: number;
  authorName?: string; // For group chat display
  authorPhoto?: string; // For group chat display
  mediaType?: 'image' | 'emoji' | 'audio';
  mediaUrl?: string; // base64 or URL
}

export interface InterestTag {
  id: string;
  label: string;
  emoji: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export const POPULAR_INTERESTS: InterestTag[] = [
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'foodie', label: 'Foodie', emoji: '🍕' },
  { id: 'gym', label: 'Fitness', emoji: '💪' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾' },
  { id: 'photography', label: 'Photography', emoji: '📸' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'books', label: 'Reading', emoji: '📚' },
  { id: 'pets', label: 'Pets', emoji: '🐾' },
];

export const FEE_TYPES = [
  'Free',
  'Go Dutch (Pay your own)',
  'BYOB',
  'It\'s on me (Host pays)',
  'Split the bill',
  'Attendance fee applicable'
];

export const MEETUP_ACTIVITIES = [
  'Coffee Chat', 'Dinner', 'Drinks', 'Brunch', 'Lunch',
  'Hiking', 'Running', 'Gym Session', 'Yoga', 'Cycling', 'Sports',
  'Movie Night', 'Concert', 'Museum', 'Art Gallery', 'Comedy Club',
  'Coding Session', 'Co-working', 'Networking', 'Workshop',
  'Board Games', 'Video Games', 'Trivia Night', 'Karaoke',
  'Book Club', 'Language Exchange', 'Photography Walk',
  'Shopping', 'Thrifting', 'Market Visit',
  'Picnic', 'Beach Day', 'Camping', 'Road Trip',
  'Volunteering', 'Meditation', 'Dance', 'Cooking Class', 'Wine Tasting', 'House Party'
];

export interface Community {
  _id: string;
  name: string;
  description?: string;
  ownerUid: string;
  members: string[];
  createdAt: number;
  lastActivity: number;
}
