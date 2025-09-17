from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import os
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
import json
import time

# Password hashing
# Use a direct ident specification to avoid passlib's automatic detection issues
pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__ident="2b", deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class TokenData(BaseModel):
    username: Optional[str] = None


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def extract_rym_album_details(rym_url: str) -> dict:
    """
    Extract album details from a RateYourMusic URL
    
    Args:
        rym_url: URL to a RateYourMusic album page
        
    Returns:
        dict: Album details including title, artist, and cover_url
    """
    try:
        # Check if the URL is valid
        if not rym_url or not rym_url.startswith("https://rateyourmusic.com/release/"):
            raise ValueError("Invalid RYM URL. Must be a RateYourMusic album URL")
        
        # Create a session to maintain cookies
        session = requests.Session()
        
        # Set more realistic headers to mimic a browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
            "Referer": "https://www.google.com/"
        }
        
        # First make a request to the RYM homepage to get cookies
        session.get("https://rateyourmusic.com/", headers=headers)
        
        # Then request the album page
        response = session.get(rym_url, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title
        title_elem = soup.select_one('.album_title')
        if not title_elem:
            raise ValueError("Could not find album title on RYM page")
        
        # Clean up the title (remove shortcut text)
        title = title_elem.text.strip()
        title = re.sub(r'\s*\[Album\d+\].*$', '', title)
        
        # Extract artist
        artist_elem = soup.select_one('a.artist')
        if not artist_elem:
            raise ValueError("Could not find artist on RYM page")
        artist = artist_elem.text.strip()
        
        # Extract cover URL - look for meta tags with og:image first
        cover_url = ""
        og_image = soup.select_one('meta[property="og:image"]')
        if og_image and og_image.get('content'):
            cover_url = og_image.get('content')
        
        # If no og:image, try to find the image in various other places
        if not cover_url:
            # Try to find cover in meta tags
            twitter_image = soup.select_one('meta[name="twitter:image"]')
            if twitter_image and twitter_image.get('content'):
                cover_url = twitter_image.get('content')
        
        # If still no cover URL, look for album art in the page
        if not cover_url:
            # Look for the album cover image
            cover_img = soup.select_one('.page_release_art_frame img')
            if cover_img and cover_img.get('src'):
                cover_url = cover_img.get('src')
        
        # If we found a relative URL, convert to absolute
        if cover_url and cover_url.startswith('//'):
            cover_url = f"https:{cover_url}"
        
        return {
            "title": title.strip(),
            "artist": artist.strip(),
            "cover_url": cover_url,
            "rym_url": rym_url
        }
    
    except requests.RequestException as e:
        raise ValueError(f"Could not connect to RateYourMusic: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error parsing RYM page: {str(e)}")


def get_album_from_musicbrainz(artist_name: str, album_title: str) -> dict:
    """
    Search for album information using the MusicBrainz API
    
    Args:
        artist_name: Name of the artist/band
        album_title: Title of the album
        
    Returns:
        dict: Album details including title, artist, and cover_url
    """
    try:
        # Format the search query
        query = f'"{album_title}" AND artist:"{artist_name}" AND primarytype:album'
        
        # Set up the API endpoint
        url = f"https://musicbrainz.org/ws/2/release-group/"
        
        # Set headers with a user agent as required by MusicBrainz
        headers = {
            "User-Agent": "SluchanieApp/1.0 (https://github.com/yourusername/sluchanie)",
            "Accept": "application/json"
        }
        
        # Make the API request
        response = requests.get(
            url, 
            headers=headers, 
            params={
                "query": query,
                "fmt": "json"
            }
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Check if we got any results
        if "release-groups" not in data or len(data["release-groups"]) == 0:
            # No results found
            return None
        
        # Get the first result
        release_group = data["release-groups"][0]
        
        # Now get the cover art from Cover Art Archive using MBID
        mbid = release_group["id"]
        
        # Respect rate limiting - wait a bit before the next request
        time.sleep(1)
        
        # Get the release to find cover art
        releases_url = f"https://musicbrainz.org/ws/2/release"
        releases_response = requests.get(
            releases_url,
            headers=headers,
            params={
                "release-group": mbid,
                "fmt": "json"
            }
        )
        releases_response.raise_for_status()
        releases_data = releases_response.json()
        
        # Get the first release MBID
        if "releases" in releases_data and len(releases_data["releases"]) > 0:
            release_id = releases_data["releases"][0]["id"]
            
            # Check Cover Art Archive for covers
            cover_url = f"https://coverartarchive.org/release/{release_id}/front"
            
            # Return the album information
            return {
                "title": release_group["title"],
                "artist": release_group["artist-credit"][0]["name"],
                "cover_url": cover_url,
                "rym_url": ""  # No RYM URL available
            }
        
        # If we can't find cover art, return without it
        return {
            "title": release_group["title"],
            "artist": release_group["artist-credit"][0]["name"],
            "cover_url": "",
            "rym_url": ""
        }
        
    except requests.RequestException as e:
        print(f"MusicBrainz API error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error processing MusicBrainz data: {str(e)}")
        return None


def extract_artist_title_from_rym_url(rym_url: str) -> tuple:
    """
    Extract artist and title information from a RYM URL
    
    Args:
        rym_url: URL to a RateYourMusic album page
        
    Returns:
        tuple: (artist, title)
    """
    # Example URL: https://rateyourmusic.com/release/album/cave-sermon/fragile-wings/
    try:
        # Extract the relevant parts from the URL
        parts = rym_url.split("/")
        # Filter out empty strings
        parts = [p for p in parts if p]
        
        # Find the indices of 'release' and 'album'
        if "release" in parts and "album" in parts:
            album_index = parts.index("album")
            if album_index + 2 < len(parts):
                artist = parts[album_index + 1].replace("-", " ")
                title = parts[album_index + 2].replace("-", " ")
                
                # Capitalize words
                artist = " ".join(word.capitalize() for word in artist.split())
                title = " ".join(word.capitalize() for word in title.split())
                
                return (artist, title)
        
        return (None, None)
    except Exception:
        return (None, None)


def get_album_from_discogs(artist_name: str, album_title: str) -> dict:
    """
    Search for album information using the Discogs API
    
    Args:
        artist_name: Name of the artist/band
        album_title: Title of the album
        
    Returns:
        dict: Album details including title, artist, and cover_url
    """
    try:
        # Format the search query - use artist and title
        query = f"{artist_name} {album_title}"
        
        # Set up the API endpoint
        url = "https://api.discogs.com/database/search"
        
        # Set headers with a user agent as required by Discogs
        headers = {
            "User-Agent": "SluchanieApp/1.0 +https://github.com/yourusername/sluchanie",
            "Accept": "application/json"
        }
        
        # Make the API request
        response = requests.get(
            url, 
            headers=headers, 
            params={
                "q": query,
                "type": "release",
                "per_page": 1
            }
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Check if we got any results
        if "results" not in data or len(data["results"]) == 0:
            # No results found
            return None
        
        # Get the first result
        result = data["results"][0]
        
        # Extract cover image if available
        cover_url = ""
        if "cover_image" in result:
            cover_url = result["cover_image"]
        
        # Extract title and artist
        title = result.get("title", album_title)
        
        # The title often contains "artist - title" format
        if " - " in title and not artist_name:
            artist_name, title = title.split(" - ", 1)
        
        # Return the album information
        return {
            "title": title,
            "artist": artist_name,
            "cover_url": cover_url,
            "rym_url": ""  # No RYM URL available
        }
    
    except requests.RequestException as e:
        print(f"Discogs API error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error processing Discogs data: {str(e)}")
        return None 