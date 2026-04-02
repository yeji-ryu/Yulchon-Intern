export type DistanceLevel = '가깝다' | '적당' | '멀다';
export type PriceLevel = '싸다' | '적당' | '비싸다';

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  distance: DistanceLevel;
  price: PriceLevel;
  waiting: boolean;
  recommended_menu: string | null;
  created_by: string;
  created_at: string;
}

export interface Note {
  id: string;
  restaurant_id: string;
  nickname: string;
  day_label: string | null;
  rating: number;
  waiting: boolean;
  distance: DistanceLevel;
  price: PriceLevel;
  recommended_menu: string | null;
  text: string;
  created_at: string;
}

export interface RestaurantWithNotes extends Restaurant {
  notes: Note[];
  avgRating: number;
}
