import mongoose from 'mongoose';
import { Movie } from '@/types/movie';

const movieSchema = new mongoose.Schema<Movie>({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  poster_path: String,
  vote_average: Number,
  overview: String,
  release_date: String,
  genre_ids: [Number],
  lastUpdated: { type: Date, default: Date.now }
});

export const MovieModel = mongoose.models.Movie || mongoose.model<Movie>('Movie', movieSchema); 