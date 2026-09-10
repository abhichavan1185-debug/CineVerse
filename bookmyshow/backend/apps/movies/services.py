import logging
import os
import requests
from django.conf import settings
from apps.movies.models import Movie, Genre, Language

logger = logging.getLogger("movies")

TMDB_API_KEY = getattr(settings, "TMDB_API_KEY", os.getenv("TMDB_API_KEY", ""))
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


def fetch_live_trending_movies(limit: int = 10) -> list[dict]:
    """
    Fetches trending movies from TMDB if API key is configured.
    Falls back gracefully if API key is missing or network request fails.
    """
    if not TMDB_API_KEY:
        logger.info("TMDB_API_KEY not configured. Using database fallback for movies.")
        return []

    try:
        url = f"{TMDB_BASE_URL}/trending/movie/week"
        params = {"api_key": TMDB_API_KEY}
        response = requests.get(url, params=params, timeout=5)
        if response.status_code != 200:
            logger.warning(f"TMDB API error {response.status_code}: {response.text}")
            return []

        data = response.json()
        results = data.get("results", [])[:limit]
        formatted = []
        for item in results:
            formatted.append({
                "title": item.get("title") or item.get("original_title"),
                "poster_url": f"{TMDB_IMAGE_BASE}/w500{item.get('poster_path')}" if item.get("poster_path") else "",
                "banner_url": f"{TMDB_IMAGE_BASE}/original{item.get('backdrop_path')}" if item.get("backdrop_path") else "",
                "description": item.get("overview", ""),
                "rating": round(item.get("vote_average", 0), 1),
                "vote_count": item.get("vote_count", 0),
                "release_date": item.get("release_date"),
            })
        return formatted
    except Exception as e:
        logger.warning(f"Failed to fetch live movies from TMDB: {e}")
        return []
