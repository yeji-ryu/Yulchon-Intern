export type DistanceLevel = '가깝다' | '적당' | '멀다';
export type PriceLevel = '싸다' | '적당' | '비싸다';

export type Restaurant = {
  id: number;
  name: string;
  category: string;
  distance: DistanceLevel;
  price: PriceLevel;
  waiting: boolean;
  recommended_menu: string | null;
  created_by: string;
  created_at: string;
};

export type Note = {
  id: number;
  restaurant_id: number;
  nickname: string;
  rating: number;
  distance: string | null;
  price: string | null;
  waiting: boolean | null;
  recommended_menu: string | null;
  day_label: string | null;
  text: string;
  created_at: string;
};

export interface RestaurantWithNotes extends Restaurant {
  notes: Note[];
  avgRating: number;
}
