import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(
  request: Request,
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
    
    // Mevcut filmi bul
    const currentMovie = await MovieModel.findOne({ id: movieId });
    if (!currentMovie) {
      return NextResponse.json({ error: 'Film bulunamadı' }, { status: 404 });
    }

    // Benzer filmleri bul
    const similarMovies = await MovieModel.aggregate([
      {
        $match: {
          id: { $ne: currentMovie.id }, // Mevcut filmi hariç tut
          genre_ids: { $in: currentMovie.genre_ids }, // En az bir ortak tür
          vote_average: { 
            $gte: currentMovie.vote_average - 1.5, // Benzer puan aralığı
            $lte: currentMovie.vote_average + 1.5 
          }
        }
      },
      {
        $addFields: {
          // Ortak tür sayısını hesapla
          commonGenres: {
            $size: {
              $setIntersection: ['$genre_ids', currentMovie.genre_ids]
            }
          }
        }
      },
      {
        $sort: {
          commonGenres: -1, // Ortak tür sayısına göre sırala
          vote_average: -1, // Sonra puana göre
          popularity: -1 // Son olarak popülerliğe göre
        }
      },
      {
        $limit: 5 // Sadece 5 film getir
      }
    ]);

    return NextResponse.json({ movies: similarMovies });
  } catch (error) {
    console.error('Benzer filmler alınırken hata:', error);
    return NextResponse.json(
      { error: 'Benzer filmler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 