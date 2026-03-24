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
  centerOffset: number; // 0 = dead center, higher = further from center
}

export interface ScoredResult {
  showtime: Showtime;
  bestSeatGroup: SeatGroup | null;
  score: number; // 0-100, higher is better
  scoreBreakdown: {
    centerScore: number;
    middleRowScore: number;
    amenityScore: number;
  };
}
