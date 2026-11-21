export type CreatorSummary = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  monthlyPriceKobo: number;
};

export type ViewerState = {
  isOwner: boolean;
  isSubscribed: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
};

export type CreatorProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  monthlyPriceKobo: number;
  postCount: number;
  subscriberCount: number;
  viewer: ViewerState;
};

export type PostMedia = {
  id: string;
  type: string;
  mimeType: string;
  url: string;
};

export type Post = {
  id: string;
  visibility: string;
  createdAt: string;
  locked: boolean;
  caption: string | null;
  mediaCount: number;
  media: PostMedia[];
  creator?: { username: string; displayName: string };
};

export type PostPage = { items: Post[]; nextCursor: string | null };
