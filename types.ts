
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
  venueName?: string;
  category?: string;
  rsvpDeadline?: string; // YYYY-MM-DD
  repeatFrequency?: 'once' | 'weekly' | 'biweekly' | 'monthly';
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  badgeTitle?: string;
  photoURL: string;
  jobRole?: string;
  liveStatusMode?: string; // e.g., "Open to Collab", "Heads Down"
  isFuzzed?: boolean; // The Decoy — drifts location ~300m
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
  isPinned?: boolean;
  uid: string;
  authorName: string;
  authorPhoto: string;
  authorBadgeTitle?: string;
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
  type: 'friend_request' | 'friend_accept' | 'like' | 'comment' | 'meetup_request' | 'meetup_accept' | 'friend_post' | 'friend_event' | 'new_event' | 'announcement' | 'vibe_wave' | 'vibe_check' | 'orbit_collision' | 'message';
  fromUid?: string;
  fromName?: string;
  fromPhoto?: string;
  toUid: string;
  postId?: string;
  title?: string;
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
  replyTo?: {
    _id: string;
    text?: string;
    fromName: string;
    mediaType?: 'image' | 'emoji' | 'audio';
  };
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
  { id: 'yoga', label: 'Yoga', emoji: '🧘‍♀️' },
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'dancing', label: 'Dancing', emoji: '💃' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'anime', label: 'Anime', emoji: '🎌' },
  { id: 'boardgames', label: 'Board Games', emoji: '🎲' },
  { id: 'astrology', label: 'Astrology', emoji: '✨' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🏕️' },
  { id: 'baking', label: 'Baking', emoji: '🧁' },
  { id: 'memes', label: 'Memes', emoji: '😂' },
  { id: 'spirituality', label: 'Spirituality', emoji: '🔮' },
  { id: 'wine', label: 'Wine', emoji: '🍷' },
  { id: 'politics', label: 'Politics', emoji: '🗳️' },
  { id: 'history', label: 'History', emoji: '🏛️' },
  { id: 'cars', label: 'Cars', emoji: '🏎️' },
  { id: 'thrifting', label: 'Thrifting', emoji: '🛍️' },
  { id: 'surfing', label: 'Surfing', emoji: '🏄' },
  { id: 'volunteering', label: 'Volunteering', emoji: '🤝' },
  { id: 'comedy', label: 'Comedy', emoji: '🎭' },
  { id: 'writing', label: 'Writing', emoji: '✍️' },
  { id: 'gardening', label: 'Gardening', emoji: '🪴' },
  { id: 'tattoos', label: 'Tattoos', emoji: '🖋️' },
  { id: 'skincare', label: 'Skincare', emoji: '🧴' },
  { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', emoji: '💼' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
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
  tags?: string[];
  isPrivate?: boolean;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  authType: string;
  badgeTitle?: string;
  displayName: string;
  photoURL: string;
  bio: string;
  jobRole: string;
  createdAt: Date | number;
  postCount: number;
  storyCount: number;
  reportCount: number;
  friendCount: number;
  isSuspended: boolean;
}

export interface AdminReport {
  _id: string;
  type: 'user' | 'post' | 'story' | 'meetup' | 'community' | string;
  reporterUid: string;
  reporterName: string;
  reporterPhoto?: string | null;
  targetUid?: string | null;
  targetName: string;
  targetPhoto?: string | null;
  reason: string;
  postId?: string;
  storyId?: string | null;
  communityId?: string | null;
  postContent?: string | null;
  postImageURL?: string | null;
  postType?: string | null;
  storyImageURL?: string | null;
  storyCaption?: string | null;
  communityName?: string | null;
  communityDescription?: string | null;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface AdminCommunity {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  memberCount: number;
  isPrivate: boolean;
  isFlagged?: boolean;
  createdAt: number;
  tags: string[];
  reportCount: number;
}

export interface AdminPost {
  _id: string;
  isPinned?: boolean;
  uid: string;
  authorName: string;
  authorPhoto: string;
  authorBadgeTitle?: string;
  content: string;
  imageURL?: string | null;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  createdAt: number;
  type?: string;
}

export interface AdminStory {
  _id: string;
  uid: string;
  authorName: string;
  authorPhoto: string | null;
  imageURL: string | null;
  videoURL: string | null;
  caption: string | null;
  createdAt: number;
  reportCount: number;
}

export interface AdminEvent {
  _id: string;
  uid: string;
  authorName: string;
  authorPhoto: string | null;
  title: string;
  activity: string | null;
  date: string | null;
  startTime: string | null;
  venueName: string | null;
  feeType: string | null;
  maxGuests: number | null;
  attendeeCount: number;
  pendingCount: number;
  imageURL: string | null;
  createdAt: number;
  eventMs: number;
  isPast: boolean;
  reportCount: number;
}
