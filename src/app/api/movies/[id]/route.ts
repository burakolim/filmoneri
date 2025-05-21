import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

// Next.js 15 için Route Segment Config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Route handler
export async function GET(
  _request: NextRequest,
  context: {
    params: any;
  }
) {
  try {
    const { id } = await context.params;
    
    await connectDB();
    console.log('Film ID:', id);

    const movieId = Number(id);
    if (isNaN(movieId)) {
      console.log('Geçersiz film ID:', id);
      return NextResponse.json(
        { error: 'Geçersiz film ID' },
        { status: 400 }
      );
    }

    const movie = await MovieModel.findOne({ id: movieId });
    console.log('Bulunan film:', movie ? 'Var' : 'Yok');

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
      { status: 500 }
    );
  }
}