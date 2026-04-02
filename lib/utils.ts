import { Note, Restaurant, RestaurantWithNotes } from '@/lib/types';

const distanceOrder = { 가깝다: 0, 적당: 1, 멀다: 2 } as const;
const priceOrder = { 싸다: 0, 적당: 1, 비싸다: 2 } as const;

export function mergeRestaurants(restaurants: Restaurant[], notes: Note[]): RestaurantWithNotes[] {
  return restaurants.map((restaurant) => {
    const restaurantNotes = notes
      .filter((note) => note.restaurant_id === restaurant.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const avgRating =
      restaurantNotes.length === 0
        ? 0
        : Number(
            (
              restaurantNotes.reduce((sum, note) => sum + note.rating, 0) / restaurantNotes.length
            ).toFixed(1)
          );

    return {
      ...restaurant,
      notes: restaurantNotes,
      avgRating,
    };
  });
}

export function sortRestaurants(items: RestaurantWithNotes[], sortBy: string) {
  const cloned = [...items];

  return cloned.sort((a, b) => {
    if (sortBy === 'rating') return b.avgRating - a.avgRating;
    if (sortBy === 'reviews') return b.notes.length - a.notes.length;
    if (sortBy === 'distance') return distanceOrder[a.distance] - distanceOrder[b.distance];
    if (sortBy === 'price') return priceOrder[a.price] - priceOrder[b.price];
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
    return 0;
  });
}
