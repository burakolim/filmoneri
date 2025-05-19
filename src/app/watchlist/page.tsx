'use client';

import { useState, useEffect, Suspense, useRef } from 'react'; // Dikkat: Suspense importladık
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
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        console.error('İzleme listesi yüklenirken hataaaa:', error);
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
      setShowRecommendations(true);

      if (movies.length === 0) {
        setError('İzleme listenizde film bulunmuyor.');
        setRecommendations([]);
        return;
      }

      const response = await axios.post(
        `https://flask-api-u3bv.onrender.com/api/recommendations/${type === 'content' ? 'content-based' : 'collaborative'}`,
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

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = 800; // Kaydırma miktarı
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
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
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-4xl font-bold purple-gradient-text mb-4">İzleme Listem 🎬</h1>
          <p className="text-gray-400 text-center max-w-2xl mb-8">
            Favori filmlerin burada! Beğendiğin filmlerden yola çıkarak senin için özel öneriler hazırlıyoruz. 
            Yeni favorilerini keşfetmeye hazır mısın?
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-8">
              <button
                onClick={() => getRecommendations('content')}
                className={`group flex items-center gap-3 px-8 py-4 rounded-xl transition-all text-lg relative overflow-hidden
                  ${recommendationType === 'content'
                    ? 'purple-gradient-button text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:scale-105'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                İçerik Tabanlı Öneriler
              </button>
              <button
                onClick={() => getRecommendations('collaborative')}
                className={`group flex items-center gap-3 px-8 py-4 rounded-xl transition-all text-lg relative overflow-hidden
                  ${recommendationType === 'collaborative'
                    ? 'purple-gradient-button text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:scale-105'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                İşbirlikçi Öneriler
              </button>
            </div>
            <div className="flex gap-16 text-sm text-gray-400">
              <p className="text-center max-w-[200px]">
                <span className="block font-medium text-gray-300 mb-1">İçerik Tabanlı</span>
                Benzer türde ve temada filmler
              </p>
              <p className="text-center max-w-[200px]">
                <span className="block font-medium text-gray-300 mb-1">İşbirlikçi</span>
                Seninle benzer zevklere sahip kişilerin tercihleri
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6">
            <p className="text-center">{error}</p>
          </div>
        )}

        {showRecommendations && recommendations.length > 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-black/95 rounded-xl p-6 w-full max-w-6xl max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold purple-gradient-text">
                  {recommendationType === 'content' ? 'İçerik Tabanlı Öneriler' : 'İşbirlikçi Öneriler'}
                </h2>
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="text-white hover:text-purple-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto scrollbar-hide"
                  onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
                >
                  <div className="flex space-x-6 pb-4">
                    {recommendations.map((movie) => (
                      <div key={movie.id} className="flex-none w-64">
                        <MovieCard movie={movie} />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleScroll('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center 
                    bg-black/50 hover:bg-black/70 rounded-r-full transition-colors cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={scrollPosition <= 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center 
                    bg-black/50 hover:bg-black/70 rounded-l-full transition-colors cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!scrollContainerRef.current && 
                    scrollPosition >= scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/95 px-4 text-lg font-semibold purple-gradient-text">İzleme Listem</span>
          </div>
        </div>

        {movies.length === 0 && !error ? (
          <p className="text-gray-400 text-center mt-8">İzleme listenizde henüz film yok.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-12">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
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
