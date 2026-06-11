export const SUITS = ["C", "D", "H", "S"];
export const BID_SUITS = ["C", "D", "H", "S", "NT"];
export const RANK_VALUE = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const HIGH_CARD_POINTS = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
};

export const SIDE_SEATS = {
  0: [0, 2],
  1: [1, 3],
};

export function sideForSeat(seat) {
  return seat % 2;
}
