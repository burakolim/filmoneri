import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    await connectDB();
    console.log('Film ID:', context.params.id); // Debug için

    const movieId = Number(context.params.id);
    if (isNaN(movieId)) {
      console.log('Geçersiz film ID:', context.params.id); // Debug için
      return NextResponse.json(
        { error: 'Geçersiz film ID' },
        { status: 400 }
      );
    }

    const movie = await MovieModel.findOne({ id: movieId });
    console.log('Bulunan film:', movie ? 'Var' : 'Yok'); // Debug için

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
