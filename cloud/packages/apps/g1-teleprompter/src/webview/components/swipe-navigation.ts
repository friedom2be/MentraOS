export interface SwipeSample {
  x: number;
  y: number;
}

export type SwipeDirection = 'previous' | 'next' | null;

const MIN_SWIPE_DISTANCE_PX = 48;

export function getSwipeDirection(start: SwipeSample | null, end: SwipeSample | null): SwipeDirection {
  if (!start || !end) {
    return null;
  }

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE_PX) {
    return null;
  }

  if (Math.abs(deltaX) <= Math.abs(deltaY)) {
    return null;
  }

  return deltaX < 0 ? 'next' : 'previous';
}
