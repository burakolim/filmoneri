'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Movie } from '@/types/movie';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

interface NavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function Navbar({ isSidebarOpen, toggleSidebar }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'date';

  const sortOptions = [
    { 
      id: 'date', 
      name: 'En Yeni Filmler', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'rating', 
      name: 'En Yüksek Puan',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    { 
      id: 'popularity', 
      name: 'En Popüler',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      id: 'title', 
      name: 'A-Z Sıralama',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchMovies = async () => {
      if (debouncedSearch.trim()) {
        setIsSearching(true);
        setShowResults(true);
        try {
          const response = await axios.get(`/api/movies/search?q=${encodeURIComponent(debouncedSearch)}`);
          setSearchResults(response.data.movies);
        } catch (error) {
          console.error('Arama hatası:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    };

    searchMovies();
  }, [debouncedSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      console.log('Arama yapılıyor:', searchQuery); // Debug için
      const response = await axios.get(`/api/movies/search?q=${encodeURIComponent(searchQuery)}`);
      console.log('Arama sonuçları:', response.data); // Debug için
      
      if (response.data.movies && response.data.movies.length > 0) {
        // İlk filme yönlendir
        const firstMovie = response.data.movies[0];
        await router.push(`/movie/${firstMovie.id}`);
      } else {
        // Sonuç yoksa arama sayfasına yönlendir
        await router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
      
      setSearchQuery('');
      setShowResults(false);
    } catch (error) {
      console.error('Arama hatası:', error);
    }
  };

  const handleResultClick = async (movieId: number) => {
    try {
      setSearchQuery('');
      setShowResults(false);
      console.log('Film detay sayfasına yönlendiriliyor:', movieId); // Debug için
      await router.push(`/movie/${movieId}`);
    } catch (error) {
      console.error('Yönlendirme hatası:', error);
    }
  };

  const handleSort = (sortType: string) => {
    // Mevcut URL parametrelerini koru
    const params = new URLSearchParams(window.location.search);
    params.set('sort', sortType);
    
    // Kategori parametresi varsa onu da koru
    const category = searchParams.get('category');
    if (category) {
      params.set('category', category);
    }

    router.push(`/?${params.toString()}`);
  };

  // URL parametrelerini izle
  useEffect(() => {
    const currentSort = searchParams.get('sort');
    const currentCategory = searchParams.get('category');
    
    // Sayfa başına dön
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  return (
    <nav className="glass-effect sticky top-0 z-50 px-8 py-4 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="purple-gradient-button p-2.5 rounded-lg 
              transition-colors duration-300 shadow-lg shadow-purple-500/20"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

          <Link href="/" className="text-2xl font-bold purple-gradient-text hover:opacity-80 transition-opacity">
            Movie Mate
          </Link>

          {/* Filtreleme Menüsü */}
          <div className="hidden md:flex items-center gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSort(option.id)}
                className={`px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2
                  ${currentSort === option.id 
                    ? 'purple-gradient-button text-white' 
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {option.icon}
                <span>{option.name}</span>
              </button>
            ))}
          </div>

          {/* Mobil Filtreleme Menüsü */}
          <div className="md:hidden relative group">
            <button className="px-4 py-2 text-white hover:text-primary transition-colors">
              Filtrele
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-black/95 rounded-lg shadow-xl 
              invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSort(option.id)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2
                    ${currentSort === option.id ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                  {option.icon}
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <form 
            ref={searchContainerRef}
            onSubmit={handleSearch}
            className="relative flex-1 max-w-md mx-auto"
          >
            <div className="flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                placeholder="Film ara..."
                className="w-full bg-white/5 border border-white/10 px-4 py-1.5 rounded-l-full 
                  text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                  focus:ring-primary/50 focus:border-transparent transition-all duration-300"
              />
              <button
                type="submit"
                className="purple-gradient-button px-4 py-1.5 rounded-r-full text-sm 
                  transition-all duration-300"
              >
                Ara
              </button>
            </div>
            
            {/* Arama Sonuçları */}
            {showResults && (searchResults.length > 0 || isSearching) && (
              <div className="absolute mt-2 w-full bg-black/95 rounded-lg shadow-lg overflow-y-auto max-h-[60vh] z-50">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {searchResults.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => handleResultClick(movie.id)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-white/10 transition-colors text-left"
                      >
                        {movie.poster_path && (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-8 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="text-white text-sm font-medium">{movie.title}</h3>
                          <p className="text-gray-400 text-xs">
                            {new Date(movie.release_date).getFullYear()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="flex items-center gap-12">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-white group-hover:text-purple-400 transition-colors duration-300">
                  <div className="w-8 h-8 purple-gradient-button rounded-full flex items-center justify-center 
                    transform group-hover:scale-110 transition-all duration-300">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="group-hover:neon-text">{user.username}</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-black/95 backdrop-blur-lg rounded-lg shadow-xl overflow-hidden 
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform 
                  group-hover:translate-y-0 translate-y-2 border border-white/10">
                  <div className="p-2">
                    <Link
                      href="/watchlist"
                      className="block px-4 py-2 text-white hover:bg-white/10 rounded transition-colors duration-300"
                    >
                      İzleme Listem
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-white hover:bg-white/10 rounded transition-colors duration-300"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="purple-gradient-button px-6 py-2 rounded-full transition-all duration-300"
                >
                  Giriş Yap
                </Link>
                <Link 
                  href="/signup"
                  className="purple-gradient-button px-6 py-2 rounded-full transition-all duration-300"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}