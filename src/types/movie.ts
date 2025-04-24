import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  poster_path: String,
  vote_average: Number,
  overview: String,
  release_date: String,
  genre_ids: [Number],
  lastUpdated: { type: Date, default: Date.now }
});

export const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);

export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  lastUpdated?: Date;
}