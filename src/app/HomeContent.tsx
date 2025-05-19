'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import MovieCard from '../components/MovieCard';
import { Movie } from '@/types/movie';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeContent() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchParams = useSearchParams();
  const sort = searchParams.get('sort') || 'date';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, checkAuth } = useAuth();

  const categories = [
    { id: 28, name: 'Aksiyon', color: 'from-red-500 to-orange-500' },
    { id: 10749, name: 'Romantik', color: 'from-pink-500 to-rose-500' },
    { id: 53, name: 'Gerilim', color: 'from-purple-500 to-indigo-500' },
    { id: 35, name: 'Komedi', color: 'from-yellow-500 to-amber-500' },
    { id: 12, name: 'Macera', color: 'from-green-500 to-emerald-500' },
    { id: 878, name: 'Bilim Kurgu', color: 'from-blue-500 to-cyan-500' },
    { id: 9648, name: 'Gizem', color: 'from-violet-500 to-purple-500' },
    { id: 80, name: 'Suç', color: 'from-slate-500 to-gray-500' },
  ];

  const fetchMovies = async (pageNumber: number) => {
    try {
      setLoading(true);
      const url = new URL('/api/movies', window.location.origin);
      url.searchParams.set('page', pageNumber.toString());
      url.searchParams.set('sort', sort);
      if (selectedCategory) {
        url.searchParams.set('category', selectedCategory.toString());
      }

      const response = await axios.get(url.toString());

      if (pageNumber === 1) {
        setMovies(response.data.movies);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMovies(prev => [...prev, ...response.data.movies]);
      }

      setHasMore(response.data.hasMore);
    } catch (error) {
      console.error('Film verileri çekilemedi:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchMovies(1);
  }, [selectedCategory, sort]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(nextPage);
    }
  };

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <main className="min-h-screen flex">
      {/* Sidebar */}
      <div className={`w-64 glass-effect min-h-screen fixed left-0 top-0 p-6 border-r border-white/10
        transform transition-transform duration-300 ease-in-out z-40
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 mt-20">
          <h2 className="text-xl font-semibold purple-gradient-text mb-6">Film Türleri</h2>
          <div className="space-y-3">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`w-full text-left px-4 py-2.5 rounded-full transition-all duration-300 relative group overflow-hidden ${
                selectedCategory === null
                  ? 'purple-gradient-button text-white'
                  : 'text-gray-400 hover:text-white glass-effect'
              }`}
            >
              <span className="relative z-10">Tümü</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`w-full text-left px-4 py-2.5 rounded-full transition-all duration-300 relative group overflow-hidden ${
                  selectedCategory === category.id
                    ? 'purple-gradient-button text-white'
                    : 'text-gray-400 hover:text-white glass-effect'
                }`}
              >
                <span className="relative z-10">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className={`fixed top-0 right-0 z-50 transition-all duration-300
          ${isSidebarOpen ? 'left-64' : 'left-0'}`}
        >
          <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        </div>
        <div className="container mx-auto px-8 py-8 mt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie, index) => (
              <MovieCard key={`${movie.id}-${index}`} movie={movie} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="purple-gradient-button py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Yükleniyor...' : 'Daha Fazla Film Göster'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
