import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';
import axios from 'axios';
import cron from 'node-cron';
import { Movie } from '@/types/movie';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat

// Veritabanı güncelleme kontrolü
async function shouldUpdateMovies() {
  const lastUpdate = await MovieModel.findOne().sort({ lastUpdated: -1 });
  if (!lastUpdate) return true;

  const timeSinceLastUpdate = Date.now() - lastUpdate.lastUpdated.getTime();
  return timeSinceLastUpdate > CACHE_DURATION;
}

// TMDB'den film verilerini çek ve MongoDB'ye kaydet
async function fetchAndStoreMovies() {
  try {
    console.log('Film verileri güncelleniyor...');
    const uniqueMovies = new Set();
    let totalMovies = 0;
    let failedRequests = 0;

    // Farklı kategorileri tanımla ve sayfa sayısını artır
    const endpoints = [
      { path: 'upcoming', pages: 50 },      // 1000 film
      { path: 'now_playing', pages: 50 },   // 1000 film
      { path: 'popular', pages: 100 },      // 2000 film
      { path: 'top_rated', pages: 100 }     // 2000 film
    ];

    for (const endpoint of endpoints) {
      for (let page = 1; page <= endpoint.pages; page++) {
        try {
          const response = await axios.get(
            `https://api.themoviedb.org/3/movie/${endpoint.path}`,
            {
              params: {
                api_key: TMDB_API_KEY,
                language: 'tr-TR',
                page: page,
                region: 'TR'
              }
            }
          );

          const movies = response.data.results.filter((movie: any) => {
            if (!uniqueMovies.has(movie.id)) {
              uniqueMovies.add(movie.id);
              return true;
            }
            return false;
          });

          if (movies.length > 0) {
            const operations = movies.map((movie: { id: any; popularity: any; vote_count: any; }) => ({
              updateOne: {
                filter: { id: movie.id },
                update: {
                  $set: {
                    ...movie,
                    category: endpoint.path,
                    lastUpdated: new Date(),
                    popularity: movie.popularity || 0,
                    vote_count: movie.vote_count || 0
                  }
                },
                upsert: true
              }
            }));

            await MovieModel.bulkWrite(operations);
            totalMovies += movies.length;
            console.log(`${endpoint.path} - Sayfa ${page}: ${movies.length} film eklendi`);
          }

          // Rate limit'e takılmamak için bekleme süresini artır
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Hata: ${endpoint.path} - Sayfa ${page}:`, error);
          failedRequests++;
          if (failedRequests > 10) { // Hata toleransını artır
            throw new Error('Çok fazla başarısız istek');
          }
          // Hata durumunda daha uzun bekle
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log(`Toplam ${totalMovies} film güncellendi`);
  } catch (error) {
    console.error('Film güncelleme hatası:', error);
    throw error;
  }
}

// Her gün gece yarısı verileri güncelle
cron.schedule('0 0 * * *', async () => {
  try {
    await connectDB();
    if (await shouldUpdateMovies()) {
      await fetchAndStoreMovies();
    }
  } catch (error) {
    console.error('Otomatik güncelleme hatası:', error);
  }
});

// API endpoint'i
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    
    // Veritabanı boşsa veya güncelleme zamanı geldiyse, verileri çek
    const movieCount = await MovieModel.countDocuments();
    if (movieCount === 0 || await shouldUpdateMovies()) {
      console.log('Veritabanı güncelleniyor...');
      await fetchAndStoreMovies();
    }

    // Sayfalama ve filtreleme parametreleri
    const page = Number(searchParams.get('page')) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'date';

    // Sorgu oluştur
    let query: any = {};
    if (category) {
      query.genre_ids = Number(category);
    }

    // Sıralama seçenekleri
    const sortOptions: { [key: string]: any } = {
      popularity: { popularity: -1, id: 1 },
      rating: { vote_average: -1, id: 1 },
      date: { release_date: -1, id: 1 },
      title: { title: 1, id: 1 }
    };

    // Veritabanından filmleri çek
    const [movies, total] = await Promise.all([
      MovieModel.find(query)
        .sort(sortOptions[sort] || sortOptions.date)
        .skip(skip)
        .limit(limit)
        .lean(),
      MovieModel.countDocuments(query)
    ]);

    return NextResponse.json({
      movies,
      total,
      hasMore: total > skip + limit,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Film verileri alınırken hata:', error);
    return NextResponse.json(
      { error: 'Filmler yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Arama endpoint'i ekleyelim
export async function POST(request: Request) {
  try {
    await connectDB();
    const { query } = await request.json();

    // Önce veritabanında ara
    const movies = await MovieModel.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { overview: { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ popularity: -1 })
    .limit(20)
    .lean();

    // Eğer yeterli sonuç yoksa ve güncelleme zamanı geldiyse, API'den ara
    if (movies.length < 5 && await shouldUpdateMovies()) {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/movie`,
        {
          params: {
            api_key: TMDB_API_KEY,
            query,
            language: 'tr-TR'
          }
        }
      );

      // Yeni filmleri veritabanına kaydet
      const operations = response.data.results.map((movie: any) => ({
        updateOne: {
          filter: { id: movie.id },
          update: { $set: { ...movie, lastUpdated: new Date() } },
          upsert: true
        }
      }));

      if (operations.length > 0) {
        await MovieModel.bulkWrite(operations);
      }

      // Güncel sonuçları getir
      const updatedMovies = await MovieModel.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { overview: { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ popularity: -1 })
      .limit(20)
      .lean();

      return NextResponse.json({ movies: updatedMovies });
    }

    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Film arama hatası:', error);
    return NextResponse.json(
      { error: 'Arama işlemi başarısız' },
      { status: 500 }
    );
  }
} 