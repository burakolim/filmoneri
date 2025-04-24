import { NextResponse, NextRequest } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';
import type { NextApiRequest } from 'next';
import type { NextRequest as AppRouteRequest } from 'next/server';
import type { NextApiResponse } from 'next';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(
  req: AppRouteRequest,
  { params }: Params
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

    const movie = await MovieModel.findOne({ id: movieId });

    if (!movie) {
      return NextResponse.json(
        { error: 'Film bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(movie);
  } catch (error) {
    return NextResponse.json(
      { error: 'Film detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
