export interface SearchParams {
  area: string;
  movie?: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  numSeats: number;
}

export interface Theater {
  name: string;
  address: string;
  amenities: string[];
  chain: string;
}

export interface Showtime {
  theater: Theater;
  movie: string;
  dateTime: string;
  format: string;
  bookingUrl: string;
}

export interface SeatGroup {
  row: string;
  seats: string[];
  rowIndex: number;
  totalRows: number;
  centerOffset: number;
}

export interface ScoredResult {
  showtime: Showtime;
  bestSeatGroup: SeatGroup | null;
  score: number;
  scoreBreakdown: {
    centerScore: number;
    middleRowScore: number;
    amenityScore: number;
  };
}

export interface SeatRecommendation {
  seats: string[]; // e.g. ["G9", "G10", "G11"]
  row: string; // e.g. "G"
  rowNumber: number; // 1-indexed from screen
  totalRows: number;
  score: number;
  description: string; // e.g. "Row G, Seats 9-11 (center, row 7 of 13)"
}

export interface PriceInfo {
  adult: number;
  child: number;
  senior: number;
  fee: number;
}

export interface ShowtimeDetail {
  time: string;
  format: string;
  bookingUrl: string;
  score: number;
  seatRecommendation: SeatRecommendation | null;
  price: PriceInfo | null;
}

// Grouped results for the UI
export interface TheaterResult {
  theater: Theater;
  movie: string;
  bestScore: number;
  showtimes: ShowtimeDetail[];
}
