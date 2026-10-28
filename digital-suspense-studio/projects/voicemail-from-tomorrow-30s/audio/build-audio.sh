#!/usr/bin/env bash
#
# build-audio.sh - assemble the 30 s mix for "Voicemail from Tomorrow".
#
# Everything here is synthesised or generated: the seven vo-*.mp3 takes are
# text-to-speech, and every other sound (chime, static, ringtone, knocks, room
# tone) is built from FFmpeg signal generators. No third-party audio is used,
# so there is no sample to license and nothing to credit.
#
#   ./build-audio.sh              writes audio/mix.wav (mono 48 kHz, 30.00 s)
#
# Requires ffmpeg + ffprobe on PATH, or: FFMPEG=/path/to/ffmpeg ./build-audio.sh
#
# Two portability notes, both learned the hard way on this repo's FFmpeg:
#
#   * Noise comes from aevalsrc's random(), not anoisesrc. This build has no
#     seedable noise source, so anoisesrc returns a different file every run.
#     random() is deterministic, which keeps a rebuild byte-identical.
#   * Levels are FITTED BY MEASUREMENT, never trusted from the generator.
#     `sine` renders at -18 dBFS here (not full scale), and builds disagree
#     about whether amix averages or sums. Every element is scaled until its
#     measured peak or mean hits the number written next to it, so the mix
#     means the same thing on any FFmpeg.
#
set -euo pipefail
cd "$(dirname "$0")"

FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"
SR=48000
DUR=30
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

q() { "$FF" -y -hide_banner -loglevel error "$@"; }

NOISE="aevalsrc=random(0)*2-1:s=${SR}"
TONE52="aevalsrc=0.9*sin(2*PI*52*t):s=${SR}"
TONE104="aevalsrc=0.9*sin(2*PI*104*t):s=${SR}"

# ---------------------------------------------------------------------------
# Measurement helpers
#
# volumedetect prints "[Parsed_volumedetect_0 @ 0x...] max_volume: -3.1 dB",
# so the number is the fifth field.
# ---------------------------------------------------------------------------
peak_db() {
  "$FF" -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 \
    | awk '/max_volume/ {print $5; exit}'
}
mean_db() {
  "$FF" -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 \
    | awk '/mean_volume/ {print $5; exit}'
}
window_peak_db() { # file start_s duration_s
  "$FF" -hide_banner -nostats -ss "$2" -t "$3" -i "$1" -af volumedetect -f null - 2>&1 \
    | awk '/max_volume/ {print $5; exit}'
}

# fit <file> <target_db> [peak|mean] - scale a file onto an exact level.
fit() {
  local file="$1" target="$2" meter="${3:-peak}" measured gain
  if [ "$meter" = "mean" ]; then measured=$(mean_db "$file"); else measured=$(peak_db "$file"); fi
  case "$measured" in
    ''|-inf|-91.0) echo "  (unmeasurable: $file, left alone)"; return 0 ;;
  esac
  gain=$(awk -v t="$target" -v m="$measured" 'BEGIN{printf "%.4f", 10 ^ ((t - m) / 20)}')
  q -i "$file" -af "volume=$gain" -c:a pcm_s16le "$file.fit.wav"
  mv "$file.fit.wav" "$file"
}

# place <src> <out> <start_ms> <gain> - drop a sound onto a 30 s silent bed.
place() {
  q -i "$1" -af "volume=$4,adelay=$3,apad" -ar "$SR" -ac 1 -c:a pcm_s16le -t "$DUR" "$2"
}

# ---------------------------------------------------------------------------
# 1. Voice-over
#
# The spec calls for "you, but wrong": pitch down 2.5 semitones (asetrate 41563
# against a 48 kHz stream, corrected back to length with atempo), a little
# bit-crush saturation, a telephone band, a compress/limit pass for grip, and a
# 40 ms ghost copy underneath at -10 dB.
# ---------------------------------------------------------------------------
VO_CHAIN="aformat=channel_layouts=mono,aresample=${SR},asetrate=41563,aresample=${SR},atempo=1.1549,highpass=170,lowpass=3600,acrusher=bits=13:mix=0.22,acompressor=threshold=0.12:ratio=3:attack=6:release=140,alimiter=limit=0.9:level=0"

# The whisper is a different animal: closer, darker, one semitone down only.
WHISPER_CHAIN="aformat=channel_layouts=mono,aresample=${SR},asetrate=45299,aresample=${SR},atempo=1.0594,highpass=210,lowpass=5200,acompressor=threshold=0.06:ratio=6:attack=3:release=90,alimiter=limit=0.9:level=0"

# proc <src> <out> <tempo> [max_seconds]
# Renders the take, layers the ghost, and can hard-cut the tail (vo-06 is
# chopped mid-word by the static at 22.20 s).
proc() {
  local src="$1" out="$2" tempo="$3" maxs="${4:-}"
  local chain="$VO_CHAIN"
  [ "$tempo" != "1" ] && chain="${chain},atempo=${tempo}"
  local trim=""
  if [ -n "$maxs" ]; then
    local fade
    fade=$(awk -v m="$maxs" 'BEGIN{printf "%.3f", m - 0.012}')
    trim=",atrim=0:${maxs},afade=t=out:st=${fade}:d=0.012"
  fi
  q -i "$src" -filter_complex \
    "[0:a]${chain}${trim}[p];[p]asplit=2[a][b];[b]adelay=40,volume=0.60[g];[a][g]amix=inputs=2:dropout_transition=0[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$out"
}

proc_whisper() {
  q -i "$1" -filter_complex \
    "[0:a]${WHISPER_CHAIN}[p];[p]asplit=2[a][b];[b]adelay=22,volume=0.80[g];[a][g]amix=inputs=2:dropout_transition=0[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$2"
}

# vo_stem <name> <start_ms> <tempo> [max_seconds]
vo_stem() {
  local name="$1" start="$2" tempo="$3" maxs="${4:-}"
  proc "$name.mp3" "$TMP/${name}.proc.wav" "$tempo" "$maxs"
  local before
  before=$(mean_db "$TMP/${name}.proc.wav")
  fit "$TMP/${name}.proc.wav" -21 mean
  place "$TMP/${name}.proc.wav" "$TMP/${name}.stem.wav" "$start" 1
  printf '  %-6s start %5d ms  tempo %-4s  raw %6s dB mean -> -21 dB\n' "$name" "$start" "$tempo" "$before"
}

echo "voice-over"
vo_stem vo-01  3200 1.00
vo_stem vo-02  5567 1.02
vo_stem vo-03  9867 1.06
vo_stem vo-04 14067 1.00
vo_stem vo-05 18167 1.12
# "That's why I'm calling from-" gets 1.53 s before the static takes it.
vo_stem vo-06 20633 1.08 1.53
proc_whisper vo-07.mp3 "$TMP/vo-07.proc.wav"
fit "$TMP/vo-07.proc.wav" -24 mean
place "$TMP/vo-07.proc.wav" "$TMP/vo-07.stem.wav" 24600 1
echo "  vo-07  start 24600 ms  (whisper)             -> -24 dB mean"

# ---------------------------------------------------------------------------
# 2. Room tone - a fridge hum under everything, dead by 28.15 s so the last
#    1.85 s of the film is true silence.
# ---------------------------------------------------------------------------
echo "room tone"
q -f lavfi -i "${TONE52}:d=28.3" \
  -f lavfi -i "${TONE104}:d=28.3" \
  -f lavfi -i "${NOISE}:d=28.3" \
  -filter_complex "[0]volume=0.055[a];[1]volume=0.022[b];[2]lowpass=260,highpass=32,volume=0.05[c];[a][b][c]amix=inputs=3:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=28.02:d=0.13[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.wav"
fit "$TMP/bed.wav" -46 mean

# ---------------------------------------------------------------------------
# 3. Notification chime - deliberately a little too loud for the room.
# ---------------------------------------------------------------------------
echo "chime"
q -f lavfi -i "aevalsrc=0.9*sin(2*PI*1046.5*t):s=${SR}:d=1.2" \
  -f lavfi -i "aevalsrc=0.9*sin(2*PI*1568*t):s=${SR}:d=1.2" \
  -filter_complex "[0]afade=t=in:st=0:d=0.004,afade=t=out:st=0.03:d=0.62:curve=exp,volume=0.5[a];[1]afade=t=in:st=0:d=0.004,afade=t=out:st=0.02:d=0.55:curve=exp,adelay=52,volume=0.38[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/chime.raw.wav"
fit "$TMP/chime.raw.wav" -4 peak
place "$TMP/chime.raw.wav" "$TMP/chime.stem.wav" 120 1

# ---------------------------------------------------------------------------
# 4. Static burst at 22.20 s - the loudest moment in the film.
# ---------------------------------------------------------------------------
echo "static"
q -f lavfi -i "${NOISE}:d=1.10" \
  -af "highpass=300,lowpass=7600,acrusher=bits=5:mix=0.35,afade=t=in:st=0:d=0.004,afade=t=out:st=0.42:d=0.66,alimiter=limit=0.99:level=0" \
  -ar "$SR" -ac 1 "$TMP/static.raw.wav"
fit "$TMP/static.raw.wav" -0.5 peak
place "$TMP/static.raw.wav" "$TMP/static.stem.wav" 22200 1

# ---------------------------------------------------------------------------
# 5. Ringtone - a boring stock one, on purpose. 1 s on, 0.6 s off, 1 s on.
# ---------------------------------------------------------------------------
echo "ringtone"
q -f lavfi -i "aevalsrc=0.35*(sin(2*PI*440*t)+sin(2*PI*480*t)):s=${SR}:d=1.0" \
  -af "afade=t=in:st=0:d=0.02,afade=t=out:st=0.94:d=0.06" \
  -ar "$SR" -ac 1 "$TMP/ring.burst.wav"
place "$TMP/ring.burst.wav" "$TMP/ring.late.wav" 1600 1
q -i "$TMP/ring.burst.wav" -i "$TMP/ring.late.wav" \
  -filter_complex "[0][1]amix=inputs=2:dropout_transition=0,alimiter=limit=0.99:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 -t 2.7 "$TMP/ring.raw.wav"
# Late copy is the padded 30 s version; trim the pair back to the ring itself.
q -i "$TMP/ring.raw.wav" -af "atrim=0:2.7" -ar "$SR" -ac 1 "$TMP/ring.trim.wav"
fit "$TMP/ring.trim.wav" -20 peak
place "$TMP/ring.trim.wav" "$TMP/ring.stem.wav" 24000 1

# ---------------------------------------------------------------------------
# 6. Knocks - three, half a second apart, then nothing at all.
# ---------------------------------------------------------------------------
echo "knocks"
q -f lavfi -i "${NOISE}:d=0.09" -f lavfi -i "aevalsrc=0.9*sin(2*PI*68*t):s=${SR}:d=0.16" \
  -filter_complex "[0]lowpass=1500,highpass=95,afade=t=out:st=0.006:d=0.08:curve=exp,volume=0.7[a];[1]afade=t=in:st=0:d=0.002,afade=t=out:st=0.012:d=0.145:curve=exp,volume=0.85[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/knock.raw.wav"
fit "$TMP/knock.raw.wav" -6 peak
place "$TMP/knock.raw.wav" "$TMP/knock1.stem.wav" 27000 0.92
place "$TMP/knock.raw.wav" "$TMP/knock2.stem.wav" 27492 0.99
place "$TMP/knock.raw.wav" "$TMP/knock3.stem.wav" 28018 1.00

# ---------------------------------------------------------------------------
# 7. Master
#
# 14 stems go into amix. Whether that averages or sums depends on the FFmpeg
# build, so the make-up gain is MEASURED, not assumed: mix once at unity, read
# the static window (which must land on -0.5 dBFS), then scale the whole mix by
# exactly the error. The static is the loudest thing in the film, so if it is
# right the rest of the balance is right too.
# ---------------------------------------------------------------------------
STEMS=(
  "$TMP/bed.wav" "$TMP/chime.stem.wav"
  "$TMP/vo-01.stem.wav" "$TMP/vo-02.stem.wav" "$TMP/vo-03.stem.wav"
  "$TMP/vo-04.stem.wav" "$TMP/vo-05.stem.wav" "$TMP/vo-06.stem.wav"
  "$TMP/vo-07.stem.wav" "$TMP/static.stem.wav" "$TMP/ring.stem.wav"
  "$TMP/knock1.stem.wav" "$TMP/knock2.stem.wav" "$TMP/knock3.stem.wav"
)

mix_with() { # scalar outfile
  local scalar="$1" out="$2" args=()
  for stem in "${STEMS[@]}"; do args+=(-i "$stem"); done
  q "${args[@]}" \
    -filter_complex "amix=inputs=${#STEMS[@]}:dropout_transition=0,volume=${scalar},alimiter=limit=0.97:level=0,aresample=${SR}[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le -t "$DUR" "$out"
}

echo "mix"
mix_with 1 "$TMP/probe.wav"
probe=$(window_peak_db "$TMP/probe.wav" 22.2 1.1)
scalar=$(awk -v p="$probe" 'BEGIN{printf "%.4f", 10 ^ ((-0.5 - p) / 20)}')
printf '  unity mix puts the static at %s dB, make-up gain x%s\n' "$probe" "$scalar"

mix_with "$scalar" mix.wav
static_peak=$(window_peak_db mix.wav 22.2 1.1)
awk -v p="$static_peak" 'BEGIN{ d = p - (-0.5); if (d > 0.6 || d < -0.6) { printf "  static landed at %s dB, expected -0.5: mix is unbalanced\n", p; exit 1 } }' \
  || { echo "FATAL: master calibration failed"; exit 1; }

echo
echo "  window levels in mix.wav"
report() { printf '    %-22s mean %7s dB   peak %6s dB\n' "$1" \
  "$("$FF" -hide_banner -nostats -ss "$2" -t "$3" -i mix.wav -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5; exit}')" \
  "$(window_peak_db mix.wav "$2" "$3")"; }
report "0.0-3.0 hook"          0     3
report "3.0-21.0 voicemail"    3     18
report "22.2-23.3 static"      22.2  1.1
report "24.0-27.0 ring"        24    3
report "27.0-28.2 knocks"      27    1.2
report "28.2-30.0 silence"     28.2  1.8

# ffprobe is optional: some installs (the npm @ffmpeg-installer package, for
# one) ship the encoder alone, so fall back to the timestamp FFmpeg prints
# while decoding the file.
if command -v "$FP" >/dev/null 2>&1; then
  DURATION=$("$FP" -v error -show_entries format=duration -of csv=p=0 mix.wav)
else
  DURATION=$("$FF" -hide_banner -i mix.wav -f null - 2>&1 \
    | awk -F'time=' '/time=/{t=$2} END{split(t, a, ":"); printf "%.3f", a[1] * 3600 + a[2] * 60 + a[3]}')
fi

echo
printf 'mix.wav  %s s  %s\n' "$DURATION" "$(du -h mix.wav | cut -f1)"

# The film's last 1.7 s are digital silence on purpose. A rebuild that pads or
# normalises them away has broken the ending, so fail loudly.
case "$DURATION" in
  30.000|30.00*) ;;
  *) echo "  expected exactly 30.000 s, got ${DURATION}" >&2; exit 1 ;;
esac
