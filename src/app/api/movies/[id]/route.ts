import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

// ✅ Vercel uyumlu context interface
interface GetMovieContext {
  params: {
    id: string;
  };
}

// ✅ GET endpoint'i
export async function GET(req: NextRequest, context: GetMovieContext) {
  try {
    await connectDB();

    const movieId = Number(context.params.id);

    // ID sayıya dönüştürülemezse
    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: 'Geçersiz film ID' },
        { status: 400 }
      );
    }

    // DB'den film bul
    const movie = await MovieModel.findOne({ id: movieId });

    // Film yoksa
    if (!movie) {
      return NextResponse.json(
        { error: 'Film bulunamadı' },
        { status: 404 }
      );
    }

    // Film bulunduysa
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Film detayları alınırken hata:', error);
    return NextResponse.json(
      { error: 'Film detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
