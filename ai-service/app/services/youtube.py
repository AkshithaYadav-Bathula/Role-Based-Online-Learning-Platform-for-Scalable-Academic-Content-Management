from __future__ import annotations

import re
from typing import Dict, Tuple

from youtube_transcript_api import YouTubeTranscriptApi


_VIDEO_ID_PATTERNS = [
    re.compile(r"(?:v=|/)([A-Za-z0-9_-]{11})(?:[?&/]|$)"),
    re.compile(r"^([A-Za-z0-9_-]{11})$"),
]


def extract_youtube_video_id(source_url: str) -> str | None:
    for pattern in _VIDEO_ID_PATTERNS:
        match = pattern.search(source_url)
        if match:
            return match.group(1)
    return None


def fetch_youtube_transcript(source_url: str, language: str = "en") -> Tuple[str, Dict[str, str]]:
    video_id = extract_youtube_video_id(source_url)
    if not video_id:
        raise ValueError("A valid YouTube URL or video ID is required for transcript ingestion.")

    transcript = YouTubeTranscriptApi().fetch(video_id, languages=(language,))
    transcript_items = transcript.to_raw_data()
    transcript_text = " ".join(item.get("text", "").replace("\n", " ").strip() for item in transcript_items).strip()

    if not transcript_text:
        raise ValueError("No transcript text was returned for this YouTube video.")

    metadata = {
        "video_id": video_id,
        "source_url": source_url,
        "language": language,
    }
    return transcript_text, metadata