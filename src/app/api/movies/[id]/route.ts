import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const movieId = Number(params.id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: 'Geçersiz film ID' },
        { status: 400 }
      );
    }

    const currentMovie = await MovieModel.findOne({ id: movieId });

    if (!currentMovie) {
      return NextResponse.json(
        { error: 'Film bulunamadı' },
        { status: 404 }
      );
    }

    const similarMovies = await MovieModel.find({
      id: { $ne: movieId },
      genre_ids: { $in: currentMovie.genre_ids }
    })
      .sort({ popularity: -1 })
      .limit(10);

    return NextResponse.json({ movies: similarMovies });
  } catch (error) {
    console.error('Benzer filmler alınırken hata:', error);
    return NextResponse.json(
      { error: 'Benzer filmler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
