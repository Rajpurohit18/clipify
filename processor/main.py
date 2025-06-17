import sys
import os
import whisper
import ffmpeg
import numpy as np
import math

# Configure FFmpeg path
ffmpeg_path = r"C:\ffmpeg\ffmpeg.exe"  # Update this path to match your FFmpeg installation
os.environ["PATH"] = os.path.dirname(ffmpeg_path) + os.pathsep + os.environ["PATH"]

def transcribe_video(input_path):
    model = whisper.load_model('base')
    result = model.transcribe(input_path)
    return result

def analyze_transcription(transcription):
    # Always return the first segment for demo purposes
    return transcription['segments'][:1]

def clip_video(input_path, output_path, segments):
    if not segments:
        print('No exciting segments found.')
        return

    # Use the first exciting segment for demonstration
    segment = segments[0]
    start_time = segment['start']
    end_time = segment['end']

    # FFmpeg command to clip the video and overlay subtitles
    stream = ffmpeg.input(input_path)
    stream = ffmpeg.filter(stream, 'trim', start=start_time, end=end_time)
    stream = ffmpeg.filter(stream, 'setpts', 'PTS-STARTPTS')
    stream = ffmpeg.filter(stream, 'drawtext', text=segment['text'], fontsize=24, fontcolor='white', x=10, y=10)
    stream = ffmpeg.output(stream, output_path)
    ffmpeg.run(stream)

def split_video(input_path, output_dir, clip_duration=60):
    probe = ffmpeg.probe(input_path)
    duration = float(probe['format']['duration'])
    num_clips = math.ceil(duration / clip_duration)

    for i in range(num_clips):
        start = i * clip_duration
        output_path = os.path.join(output_dir, f'clip_{i+1}.mp4')
        (
            ffmpeg
            .input(input_path, ss=start, t=clip_duration)
            # Center crop to 9:16 and resize to 1080x1920
            .filter('crop', 'ih*9/16', 'ih')  # crop to 9:16 based on input height
            .filter('scale', 1080, 1920)
            .output(output_path, c='libx264', crf=23, preset='veryfast')
            .run(overwrite_output=True)
        )
        print(f"Created {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python main.py <input_video_path> <output_dir>')
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    split_video(input_path, output_dir, clip_duration=60) 