from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.decomposition import TruncatedSVD
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import pandas as pd

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://filmoneri.vercel.app", "http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# MongoDB bağlantısı
try:
    MONGODB_URI = os.getenv("MONGODB_URI")
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

# Content-Based Öneri Sistemi
def get_content_based_recommendations(movie_ids, n=10):
    try:
        movies_data = get_movies_from_db()
        if not movies_data:
            print("Film verisi bulunamadı.")
            return []

        movie_map = {movie['id']: movie for movie in movies_data if 'genre_ids' in movie and isinstance(movie['genre_ids'], list)}

        target_movies = [movie_map[mid] for mid in movie_ids if mid in movie_map]
        if not target_movies:
            print("Hedef film bulunamadı.")
            return []

        all_genres = sorted({genre for movie in movies_data if 'genre_ids' in movie for genre in movie['genre_ids']})
        feature_matrix = []
        for movie in movies_data:
            if 'genre_ids' not in movie or not isinstance(movie['genre_ids'], list):
                continue
            genre_vector = [1 if gid in movie['genre_ids'] else 0 for gid in all_genres]
            vote_average = float(movie.get('vote_average', 5)) / 10
            feature_matrix.append([vote_average] + genre_vector)

        if not feature_matrix:
            print("Özellik matrisi oluşturulamadı.")
            return []

        feature_matrix = np.array(feature_matrix)

        target_indices = [i for i, movie in enumerate(movies_data) if movie['id'] in movie_ids]
        if not target_indices:
            print("Hedef film indeksleri bulunamadı.")
            return []

        target_features = feature_matrix[target_indices].mean(axis=0)

        similarities = np.dot(feature_matrix, target_features)
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

# Yeni Collaborative Filtering (SVD) sistemi
def get_collaborative_recommendations(movie_ids, n=10):
    try:
        users = list(users_collection.find({}, {"_id": 0, "watchlist": 1}))
        if not users:
            print("Kullanıcı verisi bulunamadı.")
            return get_content_based_recommendations(movie_ids, n)

        # Kullanıcı-film matrisini oluştur
        all_movie_ids = list({movie_id for user in users for movie_id in user.get('watchlist', [])})
        movie_id_to_idx = {mid: idx for idx, mid in enumerate(all_movie_ids)}
        idx_to_movie_id = {idx: mid for mid, idx in movie_id_to_idx.items()}

        user_movie_matrix = np.zeros((len(users), len(all_movie_ids)))

        for user_idx, user in enumerate(users):
            for movie_id in user.get('watchlist', []):
                if movie_id in movie_id_to_idx:
                    user_movie_matrix[user_idx, movie_id_to_idx[movie_id]] = 1

        if user_movie_matrix.shape[1] < 2:
            print("Yeterli film verisi yok.")
            return get_content_based_recommendations(movie_ids, n)

        # SVD
        svd = TruncatedSVD(n_components=min(20, user_movie_matrix.shape[1] - 1))
        latent_matrix = svd.fit_transform(user_movie_matrix)
        reconstructed = np.dot(latent_matrix, svd.components_)

        # Seçilen filmlerin skorlarını ortalamak
        movie_indices = [movie_id_to_idx[mid] for mid in movie_ids if mid in movie_id_to_idx]
        if not movie_indices:
            print("Seçilen film ID'leri kullanıcı-film matrisinde bulunamadı.")
            return get_content_based_recommendations(movie_ids, n)

        avg_scores = reconstructed[:, movie_indices].mean(axis=1)
        top_movie_indices = np.argsort(-avg_scores)[:n]

        recommended_ids = [idx_to_movie_id[idx] for idx in top_movie_indices if idx_to_movie_id[idx] not in movie_ids][:n]
        if not recommended_ids:
            print("Öneri bulunamadı, içerik tabanlıya dönülüyor.")
            return get_content_based_recommendations(movie_ids, n)

        print(f"Önerilen filmler (SVD Collaborative): {recommended_ids}")
        return recommended_ids

    except Exception as e:
        print(f"SVD collaborative öneri hatası: {str(e)}")
        return get_content_based_recommendations(movie_ids, n)

# API Routes
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
