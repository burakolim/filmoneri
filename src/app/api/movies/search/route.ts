import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/db';
import { MovieModel } from '@/models/movie';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ movies: [] });
    }

    // Arama terimini hazırla
    const searchTerm = query.trim().toLowerCase();

    // Ana sorgu: Başlıkta arama
    const titleQueries = [
      // 1. Öncelik: Tam başlangıç eşleşmesi
      { title: { $regex: `^${searchTerm}`, $options: 'i' } },
      // 2. Öncelik: Kelime başlangıcı eşleşmesi
      { title: { $regex: `\\b${searchTerm}`, $options: 'i' } },
      // 3. Öncelik: Herhangi bir yerde eşleşme
      { title: { $regex: searchTerm, $options: 'i' } },
      // 4. Öncelik: Her karakterin sırayla eşleşmesi
      { title: { 
        $regex: searchTerm.split('').map(char => 
          `${char}.*`
        ).join(''), 
        $options: 'i' 
      }},
      // 5. Öncelik: Açıklamada eşleşme
      { overview: { $regex: searchTerm, $options: 'i' } }
    ];

    // Her bir sorgu için ayrı ayrı ara ve birleştir
    const movies = await MovieModel.aggregate([
      {
        $match: { $or: titleQueries }
      },
      {
        $addFields: {
          matchPriority: {
            $switch: {
              branches: [
                // Tam başlangıç eşleşmesi
                { 
                  case: { 
                    $regexMatch: { 
                      input: { $toLower: "$title" }, 
                      regex: new RegExp(`^${searchTerm}`) 
                    }
                  },
                  then: 5
                },
                // Kelime başlangıcı eşleşmesi
                { 
                  case: { 
                    $regexMatch: { 
                      input: { $toLower: "$title" }, 
                      regex: new RegExp(`\\b${searchTerm}`) 
                    }
                  },
                  then: 4
                },
                // Herhangi bir yerde eşleşme
                { 
                  case: { 
                    $regexMatch: { 
                      input: { $toLower: "$title" }, 
                      regex: new RegExp(searchTerm) 
                    }
                  },
                  then: 3
                },
                // Her karakterin sırayla eşleşmesi
                { 
                  case: { 
                    $regexMatch: { 
                      input: { $toLower: "$title" }, 
                      regex: new RegExp(searchTerm.split('').map(char => `${char}.*`).join('')) 
                    }
                  },
                  then: 2
                },
                // Açıklamada eşleşme
                { 
                  case: { 
                    $regexMatch: { 
                      input: { $toLower: "$overview" }, 
                      regex: new RegExp(searchTerm) 
                    }
                  },
                  then: 1
                }
              ],
              default: 0
            }
          }
        }
      },
      {
        $sort: {
          matchPriority: -1,
          popularity: -1,
          vote_average: -1
        }
      },
      {
        $limit: 10
      }
    ]);

    return NextResponse.json({ movies });
  } catch (error) {
    return NextResponse.json(
      { error: 'Film arama hatası' },
      { status: 500 }
    );
  }
}