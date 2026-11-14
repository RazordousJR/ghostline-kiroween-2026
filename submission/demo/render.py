"""Render real CUA screen captures at natural elapsed time under one voiceover.

python submission/demo/render.py
Capture inputs live under outputs/demo-capture; narration under outputs/.
No desktop capture or browser control is performed by this script.
"""
import json
import math
import subprocess
import wave
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
CAPTURE = ROOT / "outputs/demo-capture"
OUT = ROOT / "outputs/demo-render"
OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS, WIDTH, HEIGHT = 25, 1280, 720

def run(args):
    result = subprocess.run([FFMPEG, "-nostdin", "-y", *map(str, args)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])
    return result.stderr

def render():
    with wave.open(str(ROOT / "outputs/ghostline-narration.wav")) as audio:
        duration = audio.getnframes() / audio.getframerate()
    assert duration < 180
    # Absolute narration anchors from returned speech timestamps. Silent screen
    # footage is trimmed, never sped up, to align with the continuous narration.
    boundaries = [0, 11.774, 23.252, 41.568, 56.049, 71.874, duration]
    ids = ["opening", "invitation", "transmission", "checks", "kiro", "closing"]
    manifest = []
    for i, key in enumerate(ids):
        source = json.loads((CAPTURE / key / "frames.json").read_text())
        need = boundaries[i + 1] - boundaries[i]
        assert source["duration"] >= need, (key, source["duration"], need)
        manifest.append({"asset": key, "source_in": 0, "source_out": need,
                         "sequence_start": boundaries[i], "sequence_end": boundaries[i+1],
                         "speed": 1, "rights": "Own application and Kiro development session captured with CUA"})
    frame_count = math.ceil(duration * FPS)
    video = OUT / "picture.mp4"
    command = [FFMPEG, "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", str(video)]
    with (OUT / "encode.log").open("w") as log:
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=log)
        cached = {}
        for frame in range(frame_count):
            t = frame / FPS
            index = min(len(ids)-1, next((i for i in range(len(ids)) if boundaries[i] <= t < boundaries[i+1]), len(ids)-1))
            key = ids[index]
            source = json.loads((CAPTURE / key / "frames.json").read_text()) if key not in cached else cached[key][0]
            if key not in cached: cached[key] = (source, {})
            local_t = t - boundaries[index]
            shot = max((f for f in source["frames"] if f["time"] <= local_t), key=lambda f:f["time"])
            name = shot["file"]
            images = cached[key][1]
            if name not in images:
                image = Image.open(CAPTURE / key / name).convert("RGB")
                images.clear()  # Stream bounded memory; only current frame cached.
                images[name] = ImageOps.pad(image, (WIDTH, HEIGHT), color="#f4f3e9").tobytes()
            encoder.stdin.write(images[name])
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError("Picture encoding failed; see encode.log")
    final = ROOT / "outputs/ghostline-competition-demo.mp4"
    run(["-i", video, "-i", ROOT / "outputs/ghostline-narration.wav", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", final])
    decode = run(["-v", "error", "-i", final, "-f", "null", "-"])
    report = {"duration_audio_seconds":duration, "duration_picture_seconds":frame_count/FPS,
              "frame_rate":FPS, "dimensions":[WIDTH,HEIGHT], "decode_errors":decode,
              "listening_review":"not_performed", "shots":manifest,
              "narration":"HeyGen Annie - Lifelike, continuous original speed, generated once"}
    (OUT / "verification.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({"output":str(final), "duration":duration, "frames":frame_count}))

if __name__ == "__main__": render()
