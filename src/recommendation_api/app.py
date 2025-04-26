from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import pandas as pd

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB bağlantısı ve veri yönetimi
try:
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://aykaclarmusa:aykaclarmusa@cluster0.z0spd.mongodb.net/movies?retryWrites=true&w=majority")
    client = MongoClient(MONGODB_URI, 
                        serverSelectionTimeoutMS=30000,
                        connectTimeoutMS=30000,
                        socketTimeoutMS=30000,
                        maxPoolSize=50)
    db = client['movies']
    movies_collection = db['movies']
    users_collection = db['users']
    print("MongoDB bağlantısı başarılı!")
except Exception as e:
    print(f"MongoDB bağlantı hatası: {str(e)}")

# Film verilerini saklayacak global değişken
movies_cache = None

def get_movies_from_db():
    global movies_cache
    try:
        if movies_cache is None:
            # MongoDB'den gerekli verileri al
            movies_data = list(movies_collection.find({}, {
                '_id': 0,
                'id': 1,
                'genre_ids': 1,
                'vote_average': 1,
                'title': 1,
                'overview': 1,
                'poster_path': 1,
                'release_date': 1
            }))
            
            if not movies_data:
                print("MongoDB'den film verisi alınamadı.")
                return None
                
            movies_cache = movies_data
            print(f"{len(movies_data)} film önbelleğe alındı.")
            
        return movies_cache
    except Exception as e:
        print(f"Film verisi alma hatası: {str(e)}")
        return None

# ----------------------
# Content-Based Öneri Sistemi
# ----------------------
def get_content_based_recommendations(movie_ids, n=10):
    try:
        # Önbellekten veya veritabanından filmleri al
        movies_data = get_movies_from_db()
        
        if not movies_data:
            print("Film verisi bulunamadı.")
            return []

        # ID -> film bilgisi haritası
        movie_map = {movie['id']: movie for movie in movies_data if 'genre_ids' in movie and isinstance(movie['genre_ids'], list)}

        # Hedef filmler
        target_movies = [movie_map[mid] for mid in movie_ids if mid in movie_map]
        
        if not target_movies:
            print("Hedef film bulunamadı.")
            return []

        # Özellik vektörleri oluştur
        all_genres = sorted({genre for movie in movies_data if 'genre_ids' in movie for genre in movie['genre_ids']})
        
        feature_matrix = []
        for movie in movies_data:
            if 'genre_ids' not in movie or not isinstance(movie['genre_ids'], list):
                continue
                
            genre_vector = [1 if gid in movie['genre_ids'] else 0 for gid in all_genres]
            vote_average = float(movie.get('vote_average', 5)) / 10  # 0-1 normalizasyon
            feature_matrix.append([vote_average] + genre_vector)

        if not feature_matrix:
            print("Özellik matrisi oluşturulamadı.")
            return []

        feature_matrix = np.array(feature_matrix)

        # Hedef filmlerin ortalama özellik vektörünü al
        target_indices = [i for i, movie in enumerate(movies_data) if movie['id'] in movie_ids]
        if not target_indices:
            print("Hedef film indeksleri bulunamadı.")
            return []
            
        target_features = feature_matrix[target_indices].mean(axis=0)

        # Benzerlik hesapla
        similarities = cosine_similarity(feature_matrix, target_features.reshape(1, -1)).flatten()

        # En yüksek benzerliğe sahip filmleri seç (hedef filmler hariç)
        similar_movies = []
        for idx, sim in enumerate(similarities):
            if movies_data[idx]['id'] not in movie_ids:
                similar_movies.append((movies_data[idx]['id'], sim))

        similar_movies.sort(key=lambda x: x[1], reverse=True)

        recommended_ids = [movie_id for movie_id, _ in similar_movies[:n]]
        print(f"Önerilen filmler (Content-based): {recommended_ids}")
        return recommended_ids

    except Exception as e:
        print(f"Content-based öneri hatası: {str(e)}")
        return []

# ----------------------
# Collaborative Filtering Öneri Sistemi
# ----------------------
def get_collaborative_recommendations(movie_ids, n=10):
    try:
        all_users = list(users_collection.find({}, {'_id': 0, 'watchlist': 1}))

        user_movie_matrix = {}
        for user in all_users:
            watchlist = user.get('watchlist', [])
            for movie_id in watchlist:
                user_movie_matrix.setdefault(movie_id, set()).add(tuple(watchlist))

        if not user_movie_matrix:
            print("İşbirlikçi veri yok. İçerik tabanlıya dönülüyor.")
            return get_content_based_recommendations(movie_ids, n)

        movie_similarity = {}
        for target_id in movie_ids:
            target_users = user_movie_matrix.get(target_id, set())

            for other_id, other_users in user_movie_matrix.items():
                if other_id in movie_ids:
                    continue

                intersection = len([user for user in target_users if other_id in user])
                union = len(target_users) + len(other_users) - intersection

                similarity = intersection / union if union > 0 else 0

                movie_similarity[other_id] = movie_similarity.get(other_id, 0) + similarity

        final_recommendations = sorted(movie_similarity.items(), key=lambda x: x[1], reverse=True)[:n]
        recommended_ids = [movie_id for movie_id, _ in final_recommendations]

        if not recommended_ids:
            print("İşbirlikçi öneri bulunamadı. İçerik tabanlıya dönülüyor.")
            return get_content_based_recommendations(movie_ids, n)

        print(f"Önerilen filmler (Collaborative): {recommended_ids}")
        return recommended_ids

    except Exception as e:
        print(f"Collaborative öneri hatası: {str(e)}")
        return get_content_based_recommendations(movie_ids, n)

# ----------------------
# API Routes
# ----------------------
@app.route('/api/recommendations/content-based', methods=['POST'])
def content_based():
    try:
        data = request.json
        if not data or 'movie_ids' not in data:
            return jsonify({'error': 'Film ID\'leri gerekli', 'recommendations': []}), 400
            
        movie_ids = data.get('movie_ids', [])
        if not movie_ids:
            return jsonify({'error': 'Film ID\'leri boş olamaz', 'recommendations': []}), 400
            
        recommendations = get_content_based_recommendations(movie_ids)
        if not recommendations:
            return jsonify({'error': 'Öneri bulunamadı', 'recommendations': []}), 404
            
        return jsonify({'recommendations': recommendations})
    except Exception as e:
        print(f"API hatası: {str(e)}")
        return jsonify({'error': str(e), 'recommendations': []}), 500

@app.route('/api/recommendations/collaborative', methods=['POST'])
def collaborative():
    data = request.json
    movie_ids = data.get('movie_ids', [])
    recommendations = get_collaborative_recommendations(movie_ids)
    if not recommendations:
        return jsonify({'error': 'Öneri bulunamadı', 'recommendations': []}), 404
    return jsonify({'recommendations': recommendations})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
