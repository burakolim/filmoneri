import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const id = req.nextUrl.pathname.split('/').pop();
    const movieId = Number(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: 'Geçersiz film ID' },
        { status: 400 }
      );
    }

    const movie = await MovieModel.findOne({ id: movieId });

    if (!movie) {
      return NextResponse.json(
        { error: 'Film bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Film detayları alınırken hata:', error);
    return NextResponse.json(
      { error: 'Film detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
