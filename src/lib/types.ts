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

// Grouped results for the UI — one entry per theater
export interface TheaterResult {
  theater: Theater;
  movie: string;
  bestScore: number;
  showtimes: {
    time: string;
    format: string;
    bookingUrl: string;
    score: number;
  }[];
}
