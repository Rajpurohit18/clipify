import sys
import os
import math
import ffmpeg
import yt_dlp # New import for YouTube downloading
import subprocess
import argparse
import json
from pathlib import Path

# Configure FFmpeg path
ffmpeg_path = r"C:\ffmpeg\ffmpeg.exe"  # Update this path to match your FFmpeg installation
os.environ["PATH"] = os.path.dirname(ffmpeg_path) + os.pathsep + os.environ["PATH"]

# Function to download YouTube video
def download_youtube_video(url, output_path):
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': output_path,
        'merge_output_format': 'mp4',
        'cachedir': False, # Disable caching to prevent issues
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print(f"Downloaded video from {url} to {output_path}")
        return True
    except Exception as e:
        print(f"Error downloading video from {url}: {e}")
        return False

def get_video_duration(video_path, ffmpeg_path):
    """Get the duration of a video file using ffprobe."""
    ffprobe_executable = os.path.join(os.path.dirname(ffmpeg_path), "ffprobe.exe")
    cmd = [
        ffprobe_executable,
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Failed to get video duration: {result.stderr}")
    data = json.loads(result.stdout)
    return float(data['format']['duration'])

def split_video(input_path, output_dir, clip_duration, start_time=None, end_time=None, audio_only=False, ffmpeg_path=None):
    """Split a video into clips of specified duration."""
    # Get video duration
    duration = get_video_duration(input_path, ffmpeg_path)
    
    # Adjust duration based on start and end times
    if start_time is not None:
        duration -= start_time
    if end_time is not None:
        duration = min(duration, end_time - (start_time or 0))
    
    # Calculate number of clips
    num_clips = int(duration / clip_duration) + (1 if duration % clip_duration > 0 else 0)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Split video into clips
    for i in range(num_clips):
        start = (start_time or 0) + (i * clip_duration)
        end = start + clip_duration
        
        if end_time is not None:
            end = min(end, end_time)
        
        output_path = os.path.join(output_dir, f'clip_{i+1}.mp4')
        
        # Build FFmpeg command
        cmd = [ffmpeg_path, '-y']
        
        # Add input options
        if start > 0:
            cmd.extend(['-ss', str(start)])
        
        # Add input file
        cmd.extend(['-i', input_path])
        
        # Add output options
        cmd.extend(['-t', str(end - start)])
        
        if audio_only:
            cmd.extend([
                '-vn',  # No video
                '-acodec', 'libmp3lame',  # Use MP3 codec
                '-ar', '44100',  # Sample rate
                '-ab', '192k'  # Bitrate
            ])
            output_path = output_path.replace('.mp4', '.mp3')
        else:
            cmd.extend([
                '-c', 'copy',
                '-map', '0', # Map all streams from input 0
                '-metadata', 'title=',
                '-metadata', 'comment=',
                '-metadata', 'artist=',
                '-movflags', 'use_metadata_tags' # Explicitly use metadata tags
            ])  # Copy streams without re-encoding
        
        # Add output file
        cmd.append(output_path)
        
        # Run FFmpeg command
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to create clip {i+1}: {result.stderr}")

def extract_full_audio(input_path, output_dir, ffmpeg_path):
    """Extracts the full audio from a video file."""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'full_audio.mp3')

    cmd = [
        ffmpeg_path, '-y',
        '-i', input_path,
        '-vn',  # No video
        '-acodec', 'libmp3lame',  # Use MP3 codec
        '-ar', '44100',  # Sample rate
        '-ab', '192k',  # Bitrate
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Failed to extract full audio: {result.stderr}")

def process_batch(input_dir, output_dir, clip_duration, start_time=None, end_time=None, audio_only=False, ffmpeg_path=None):
    """Process all video files in a directory."""
    # Get list of video files
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
    video_files = [
        f for f in os.listdir(input_dir)
        if os.path.isfile(os.path.join(input_dir, f)) and
        os.path.splitext(f)[1].lower() in video_extensions
    ]
    
    # Process each video file
    for video_file in video_files:
        input_path = os.path.join(input_dir, video_file)
        video_output_dir = os.path.join(output_dir, os.path.splitext(video_file)[0])
        split_video(input_path, video_output_dir, clip_duration, start_time, end_time, audio_only, ffmpeg_path)

def main():
    parser = argparse.ArgumentParser(description='Split video into clips')
    parser.add_argument('input_path', help='Path to input video file or directory')
    parser.add_argument('output_dir', help='Path to output directory')
    parser.add_argument('clip_duration', type=int, help='Duration of each clip in seconds')
    parser.add_argument('--start', type=float, help='Start time in seconds')
    parser.add_argument('--end', type=float, help='End time in seconds')
    parser.add_argument('--audio-only', action='store_true', help='Extract audio only')
    parser.add_argument('--full-audio', action='store_true', help='Extract full video audio when --audio-only is set')
    parser.add_argument('--batch', action='store_true', help='Process all videos in input directory')
    parser.add_argument('--ffmpeg_path', help='Path to ffmpeg executable')
    
    args = parser.parse_args()
    
    try:
        if args.batch:
            process_batch(args.input_path, args.output_dir, args.clip_duration,
                         args.start, args.end, args.audio_only, args.ffmpeg_path)
        elif args.audio_only and args.full_audio:
            extract_full_audio(args.input_path, args.output_dir, args.ffmpeg_path)
        else:
            split_video(args.input_path, args.output_dir, args.clip_duration,
                       args.start, args.end, args.audio_only, args.ffmpeg_path)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 