'use client';

import { useState, useEffect, Suspense } from 'react'; // Dikkat: Suspense importladık
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { Movie } from '@/types/movie';

function WatchlistContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendationType, setRecommendationType] = useState<'content' | 'collaborative' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchWatchlist = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/watchlist');
        const validMovies = response.data.movies.filter((movie: any) => movie && movie.id);
        setMovies(validMovies);
        setError(null);
      } catch (error) {
        console.error('İzleme listesi yüklenirken hata:', error);
        setError('İzleme listesi yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchWatchlist();
    }
  }, [user, loading, router]);

  const getRecommendations = async (type: 'content' | 'collaborative') => {
    try {
      setIsLoading(true);
      setRecommendationType(type);
      setError(null);

      if (movies.length === 0) {
        setError('İzleme listenizde film bulunmuyor.');
        setRecommendations([]);
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/recommendations/${type === 'content' ? 'content-based' : 'collaborative'}`,
        {
          movie_ids: movies.map((movie) => movie.id),
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        setRecommendations([]);
        return;
      }

      if (!response.data.recommendations || response.data.recommendations.length === 0) {
        setError('Öneri bulunamadı.');
        setRecommendations([]);
        return;
      }

      const recommendedMovies = await Promise.all(
        response.data.recommendations.map(async (id: number) => {
          try {
            const movieResponse = await axios.get(`/api/movies/${id}`);
            return movieResponse.data;
          } catch (error) {
            console.error(`Film detayı alınamadı (ID: ${id})`);
            return null;
          }
        })
      );

      const validMovies = recommendedMovies.filter((movie): movie is Movie => movie !== null);
      setRecommendations(validMovies);

      if (validMovies.length === 0) {
        setError('Önerilen filmler yüklenemedi.');
      }
    } catch (error) {
      console.error('Öneriler alınırken hata:', error);
      setError('Öneriler alınırken bir hata oluştu.');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-black/95">
        <Navbar isSidebarOpen={false} toggleSidebar={() => {}} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95">
      <Navbar isSidebarOpen={false} toggleSidebar={() => {}} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">İzleme Listem</h1>
          <div className="flex gap-4">
            <button
              onClick={() => getRecommendations('content')}
              className={`px-4 py-2 rounded-lg transition-all ${
                recommendationType === 'content'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              İçerik Tabanlı Öneriler
            </button>
            <button
              onClick={() => getRecommendations('collaborative')}
              className={`px-4 py-2 rounded-lg transition-all ${
                recommendationType === 'collaborative'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              İşbirlikçi Öneriler
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6">
            <p className="text-center">{error}</p>
          </div>
        )}

        {movies.length === 0 && !error ? (
          <p className="text-gray-400 text-center">İzleme listenizde henüz film yok.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {recommendations.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-white mb-6">
                  {recommendationType === 'content' ? 'İçerik Tabanlı Öneriler' : 'İşbirlikçi Öneriler'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {recommendations.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Asıl export edilen sayfa
export default function WatchlistPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <WatchlistContent />
    </Suspense>
  );
}
