'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { Movie } from '@/types/movie';

export default function Watchlist() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const response = await axios.get('/api/watchlist');
        const validMovies = response.data.movies.filter((movie: any) => movie && movie.id);
        setMovies(validMovies);
      } catch (error) {
        console.error('Watchlist yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchWatchlist();
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div>
      <Navbar isSidebarOpen={false} toggleSidebar={() => {}} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">İzleme Listem</h1>
        {movies.length === 0 ? (
          <p className="text-gray-400 text-center">İzleme listenizde henüz film yok.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 