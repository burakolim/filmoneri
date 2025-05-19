'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import MovieCard from '@/components/MovieCard';
import { Movie } from '@/types/movie';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';

// Film kategorileri
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

export default function MovieDetail() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Film ID:', id); // Debug için
        const [movieRes, similarRes] = await Promise.all([
          axios.get(`/api/movies/${id}`),
          axios.get(`/api/movies/similar/${id}`)
        ]);
  
        console.log('DETAY:', movieRes.data);
        console.log('BENZER:', similarRes.data);
  
        if (movieRes?.data) {
          setMovie(movieRes.data);
        } else {
          console.error('Film verisi bulunamadı');
        }

        if (similarRes?.data?.similar) {
          setSimilarMovies(similarRes.data.similar);
        } else {
          console.error('Benzer filmler bulunamadı');
        }
      } catch (error) {
        console.error('Film detayları yüklenirken hata:', error);
        if (axios.isAxiosError(error)) {
          console.error('API Yanıtı:', error.response?.data);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    } else {
      console.error('Film ID bulunamadı');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const checkWatchlist = async () => {
      if (user && movie) {
        try {
          const response = await axios.get('/api/watchlist');
          const isInWatchlist = response.data.movies.some(
            (m: Movie) => m.id === Number(movie.id)
          );
          setInWatchlist(isInWatchlist);
          console.log('Film watchlist durumu:', isInWatchlist); // Debug için
        } catch (error) {
          console.error('Watchlist kontrolü başarısız:', error);
        }
      }
    };

    checkWatchlist();
  }, [user, movie]);

  const handleWatchlist = async () => {
    if (!user || !movie) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.post('/api/watchlist', {
        movieId: Number(movie.id)
      });
      setInWatchlist(response.data.inWatchlist);
      
      const message = response.data.inWatchlist 
        ? 'Film izleme listenize eklendi'
        : 'Film izleme listenizden çıkarıldı';
      
      setToastMessage(message);
      setShowToast(true);
    } catch (error) {
      console.error('Watchlist işlemi başarısız:', error);
      setToastMessage('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/95">
        <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black/95">
        <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="container mx-auto px-8 py-12 text-white text-center">
          Film bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black/95">
        <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        
        {/* Movie Content */}
        <div className="container mx-auto px-8 py-12">
          <div className="flex gap-8">
            {/* Poster */}
            <div className="w-64 flex-shrink-0">
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full rounded-lg shadow-2xl"
                />
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4 text-white">{movie.title}</h1>
              <div className="flex items-center gap-4 mb-6">
                <span className="bg-primary px-3 py-1 rounded-full text-sm text-white">
                  {new Date(movie.release_date).getFullYear()}
                </span>
                <span className="flex items-center gap-1 text-white">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {movie.vote_average.toFixed(1)}
                </span>
                <button
                  onClick={handleWatchlist}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    inWatchlist 
                      ? 'bg-primary text-white hover:bg-blue-600' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={inWatchlist ? "İzleme listesinden çıkar" : "İzleme listesine ekle"}
                >
                  <svg 
                    className="w-6 h-6" 
                    fill={inWatchlist ? "currentColor" : "none"}
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                {movie.overview}
              </p>

              {/* Genres */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-white">Türler</h2>
                <div className="flex gap-2 flex-wrap">
                {(movie.genre_ids ?? movie.genres?.map(g => g.id) ?? []).map((genreId) => {
                    const genre = categories.find(c => c.id === genreId);
                    return genre ? (
                      <span
                        key={genreId}
                        className={`px-4 py-2 rounded-full text-white bg-gradient-to-r ${genre.color}`}
                      >
                        {genre.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benzer Filmler Bölümü */}
        {similarMovies.length > 0 && (
          <div className="container mx-auto px-8 py-12">
            <h2 className="text-2xl font-bold mb-6 text-white">
              Benzer Filmler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {similarMovies.map((similarMovie) => (
                <MovieCard key={similarMovie.id} movie={similarMovie} />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
} 