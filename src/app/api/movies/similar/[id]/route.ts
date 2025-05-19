import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    await connectDB();

    const movieId = Number(context.params.id);

    if (isNaN(movieId)) {
      return NextResponse.json({ error: 'Geçersiz film ID' }, { status: 400 });
    }

    const movie = await MovieModel.findOne({ id: movieId });

    if (!movie) {
      return NextResponse.json({ error: 'Film bulunamadı' }, { status: 404 });
    }

    // Aynı türden filmlerden rastgele 5 tanesini getiriyoruz
    const similarMovies = await MovieModel.aggregate([
      {
        $match: {
          id: { $ne: movieId },
          genre_ids: { $in: movie.genre_ids }
        }
      },
      { $sample: { size: 5 } }
    ]);

    return NextResponse.json({
      movie,
      similar: similarMovies
    });

  } catch (error) {
    console.error('Benzer filmler alınırken hata:', error);
    return NextResponse.json(
      { error: 'Benzer filmler yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
