import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { UserModel } from '@/models/user';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const { username, email, password } = await request.json();

    // Kullanıcı kontrolü
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı veya email zaten kullanımda' },
        { status: 400 }
      );
    }

    // Yeni kullanıcı oluştur
    const user = await UserModel.create({
      username,
      email,
      password
    });

    return NextResponse.json({
      message: 'Kayıt başarılı',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kayıt işlemi başarısız' },
      { status: 500 }
    );
  }
} 