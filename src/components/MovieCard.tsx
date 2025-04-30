import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Movie } from '@/types/movie';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Toast from './Toast';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkWatchlist = async () => {
      if (user) {
        try {
          const response = await axios.get('/api/watchlist');
          const isInWatchlist = response.data.movies.some(
            (m: Movie) => m.id === movie.id
          );
          setInWatchlist(isInWatchlist);
        } catch (error) {
          console.error('Watchlist kontrolü başarısız:', error);
        }
      }
    };

    checkWatchlist();
  }, [user, movie.id]);

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.post('/api/watchlist', {
        movieId: movie.id
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
      setShowToast(true);
    }
  };

  const voteAverage = typeof movie.vote_average === 'number' && !isNaN(movie.vote_average) 
    ? movie.vote_average.toFixed(1) 
    : '0.0';

  return (
    <>
      <Link href={`/movie/${movie.id}`} className="group perspective">
        <div className="relative transform-gpu transition-all duration-500 group-hover:scale-105">
          {/* Neon Glow Effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/50 to-indigo-500/50 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
          
          <div className="relative bg-black/40 rounded-lg overflow-hidden shadow-2xl">
            {/* Poster with Flash Effect */}
            <div className="relative overflow-hidden">
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}
              {/* Flash Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-white font-medium mb-2 group-hover:text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500 transition-colors duration-300">
                {movie.title}
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 group-hover:text-purple-400 transition-colors duration-300">
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center text-yellow-500 group-hover:text-yellow-400 transition-colors duration-300">
                    <svg className="w-4 h-4 mr-1 filter drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {voteAverage}
                  </span>
                  <button
                    onClick={handleWatchlist}
                    className={`p-1.5 rounded-full transition-all duration-300 z-10 ${
                      inWatchlist 
                        ? 'purple-gradient-button text-white' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                    }`}
                    title={inWatchlist ? "İzleme listesinden çıkar" : "İzleme listesine ekle"}
                  >
                    <svg 
                      className="w-4 h-4" 
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
              </div>
            </div>

            {/* Hover Border Effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-lg transition-colors duration-300"></div>
          </div>
        </div>
      </Link>
      
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