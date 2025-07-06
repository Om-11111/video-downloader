from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import subprocess
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/fetch-info', methods=['POST'])
def fetch_info():
    data = request.get_json()
    url = data.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        # Run yt-dlp to get JSON info about the video
        result = subprocess.run(
            ["yt-dlp", "-J", url],
            capture_output=True,
            text=True,
            check=True
        )
        info = json.loads(result.stdout)

        filtered_formats = []
        seen_resolutions = set()

        # Filter formats that have both video and audio, and no duplicate resolutions
        for f in info.get('formats', []):
            has_video = f.get('vcodec') != 'none'
            has_audio = f.get('acodec') != 'none'
            resolution = f.get('format_note') or f.get('height')

            if has_video and has_audio and resolution and resolution not in seen_resolutions:
                seen_resolutions.add(resolution)
                filtered_formats.append({
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext'),
                    'resolution': str(resolution),
                    'filesize': f.get('filesize'),
                    'format_note': f.get('format_note') or f.get('height'),
                })

        return jsonify({
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'formats': filtered_formats
        })

    except subprocess.CalledProcessError as e:
        print("YT-DLP Error:", e.stderr)
        return jsonify({'error': 'yt-dlp failed: ' + e.stderr.strip()}), 500
    except json.JSONDecodeError as e:
        print("JSON Error:", str(e))
        return jsonify({'error': 'Invalid response from yt-dlp'}), 500
    except Exception as e:
        print("Unknown error:", str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['GET'])
def download():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    if not url or not format_id:
        return "Missing url or format_id", 400

    def generate():
        command = [
            "yt-dlp",
            "-f", f"{format_id}+bestaudio",  # Merge selected video with best audio
            "--merge-output-format", "mp4",
            "-o", "-",                        # Output to stdout
            url
        ]
        with subprocess.Popen(command, stdout=subprocess.PIPE) as proc:
            for chunk in iter(lambda: proc.stdout.read(8192), b''):
                yield chunk

    headers = {
        "Content-Disposition": "attachment; filename=video.mp4"
    }
    return Response(generate(), headers=headers, content_type='application/octet-stream')


@app.route('/api/download-audio', methods=['GET'])
def download_audio():
    url = request.args.get('url')
    if not url:
        return "Missing url", 400

    def generate():
        command = [
            "yt-dlp",
            "-f", "bestaudio",
            "--extract-audio",
            "--audio-format", "mp3",
            "-o", "-",  # Output to stdout
            url
        ]
        with subprocess.Popen(command, stdout=subprocess.PIPE) as proc:
            for chunk in iter(lambda: proc.stdout.read(8192), b''):
                yield chunk

    headers = {
        "Content-Disposition": "attachment; filename=audio.mp3"
    }
    return Response(generate(), headers=headers, content_type='application/octet-stream')


if __name__ == '__main__':
    app.run(port=5000)
