import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { UserModel } from '@/models/user';

import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    await connectDB();
    
    const user = await UserModel.findById(decoded.userId).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Yetkilendirme hatası' },
      { status: 401 }
    );
  }
} 