import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { UserModel } from '@/models/user';
import { MovieModel } from '@/models/movie';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Watchlist'i getir
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    await connectDB();

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Watchlist'teki film ID'lerine göre filmleri getir
    const movies = await MovieModel.find({ 
      id: { $in: user.watchlist } 
    });

    return NextResponse.json({ movies });
  } catch (error) {
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}

// Film ekle/çıkar
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const { movieId } = await request.json();
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    await connectDB();

    let user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const isInWatchlist = user.watchlist.includes(movieId);
    
    if (isInWatchlist) {
      // Filmı çıkar
      user = await UserModel.findByIdAndUpdate(
        decoded.userId,
        { $pull: { watchlist: movieId } },
        { new: true }
      );
      return NextResponse.json({ 
        message: 'Film watchlist\'ten çıkarıldı',
        inWatchlist: false 
      });
    } else {
      // Filmi ekle
      user = await UserModel.findByIdAndUpdate(
        decoded.userId,
        { $addToSet: { watchlist: movieId } },
        { new: true }
      );
      return NextResponse.json({ 
        message: 'Film watchlist\'e eklendi',
        inWatchlist: true 
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
} 