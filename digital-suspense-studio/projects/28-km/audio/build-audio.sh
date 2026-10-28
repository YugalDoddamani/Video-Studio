#!/usr/bin/env bash
#
# build-audio.sh - assemble the 30 s mix for "2.8 km".
#
# There is no voice-over in this film. The score is seven proximity pings that
# rise in pitch as the distance falls, one notification chime, one dropout, and
# a room tone low enough to feel rather than hear. Everything is generated with
# FFmpeg signal sources, so nothing is licensed and nothing needs crediting.
#
#   ./build-audio.sh              writes audio/mix.wav (mono 48 kHz, 30.00 s)
#
# Requires ffmpeg + ffprobe on PATH, or: FFMPEG=/path/to/ffmpeg ./build-audio.sh
#
# Two portability notes, inherited from the voicemail films and still true:
#
#   * Noise comes from aevalsrc's random(), not anoisesrc. This build has no
#     seedable noise source, so anoisesrc returns a different file every run.
#     random() is deterministic, which keeps a rebuild byte-identical.
#   * Levels are FITTED BY MEASUREMENT, never trusted from the generator.
#     `sine` renders at -18 dBFS here (not full scale), so every element is
#     scaled until its measured peak hits the number written next to it.
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
# 1. Room tone
#
# 52 Hz and 104 Hz from a generator plus filtered noise, faded out at 27.0 s
# so the last three seconds of the film are true digital silence. The room is
# never allowed to be louder than something you would not notice.
# ---------------------------------------------------------------------------
echo "room tone"
q -f lavfi -i "$TONE52" -f lavfi -i "$TONE104" -f lavfi -i "$NOISE" -filter_complex \
  "[0:a]volume=0.030[a];[1:a]volume=0.012[b];[2:a]lowpass=f=260,highpass=f=34,volume=0.020[c];\
   [a][b][c]amix=inputs=3,lowpass=f=420,afade=t=in:st=0:d=0.8,afade=t=out:st=26.2:d=0.8[out]" \
  -map "[out]" -t 27.0 -ar "$SR" -ac 1 -c:a pcm_s16le "$TMP/bed.wav"
bed_before=$(mean_db "$TMP/bed.wav")
fit "$TMP/bed.wav" -46 mean
place "$TMP/bed.wav" "$TMP/bed.stem.wav" 0 1
printf '  bed %s dB mean -> -46 dB, 0.0-27.0 s\n' "$bed_before"

# ---------------------------------------------------------------------------
# 2. Proximity ping
#
# A short decaying sine with a noise transient on the front so it clicks before
# it rings. The pitch climbs with every ping: the same sound getting closer.
# ---------------------------------------------------------------------------
ping() { # freq out
  q -f lavfi -i "sine=f=$1:d=0.34" -f lavfi -i "$NOISE" -filter_complex \
    "[0:a]afade=t=in:st=0:d=0.004,afade=t=out:st=0.018:d=0.31:curve=exp[t];\
     [1:a]atrim=0:0.012,highpass=f=2200,afade=t=out:st=0:d=0.012,volume=0.18[n];\
     [t][n]amix=inputs=2[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$2"
}

# ping_stem <freq> <start_ms> <target_peak_db> <name>
ping_stem() {
  ping "$1" "$TMP/$4.wav"
  fit "$TMP/$4.wav" "$3" peak
  place "$TMP/$4.wav" "$TMP/$4.stem.wav" "$2" 1
  printf '  %-7s %5d ms  %4s Hz  peak %s dB\n' "$4" "$2" "$1" "$3"
}

echo "pings"
ping_stem 1100  900 -18 ping1
ping_stem 1100 3330 -18 ping2
ping_stem 1120 6670 -17 ping3
ping_stem 1250 14000 -16 ping4
ping_stem 1310 17000 -15 ping5
ping_stem 1370 20000 -15 ping6
ping_stem 1430 23000 -14 ping7

# ---------------------------------------------------------------------------
# 3. Arrival chime
#
# The default two-tone you have heard a thousand times, at 10.0 s, when the
# banner lands. Boring on purpose: the ping is the story, the chime is just the
# phone being a phone.
# ---------------------------------------------------------------------------
echo "chime"
q -f lavfi -i "sine=f=1046:d=0.8" -f lavfi -i "sine=f=1568:d=0.8" -filter_complex \
  "[0:a]afade=t=in:st=0:d=0.004,afade=t=out:st=0.01:d=0.76:curve=exp[a];\
   [1:a]afade=t=in:st=0:d=0.004,afade=t=out:st=0.05:d=0.72:curve=exp,volume=0.72[b];\
   [b]adelay=40[bd];[a][bd]amix=inputs=2[out]" \
  -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$TMP/chime.wav"
fit "$TMP/chime.wav" -12 peak
place "$TMP/chime.wav" "$TMP/chime.stem.wav" 10000 1

# ---------------------------------------------------------------------------
# 4. Dropout
#
# 24.5 s: the frame where her own dot leaves the map. A low thud with a short
# static crackle on top, then nothing at all. It is the loudest moment in the
# film and the only one that is not musical.
# ---------------------------------------------------------------------------
echo "dropout"
q -f lavfi -i "sine=f=58:d=0.9" -f lavfi -i "$NOISE" -filter_complex \
  "[0:a]afade=t=in:st=0:d=0.006,afade=t=out:st=0.03:d=0.85:curve=exp,volume=0.9[t];\
   [1:a]atrim=0:0.22,bandpass=f=1800:width_type=h:w=2400,afade=t=out:st=0.02:d=0.2,volume=0.35[n];\
   [t][n]amix=inputs=2[out]" \
  -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$TMP/drop.wav"
fit "$TMP/drop.wav" -10.5 peak
place "$TMP/drop.wav" "$TMP/drop.stem.wav" 24500 1

# ---------------------------------------------------------------------------
# 5. Mix
#
# Unity mix first, measure the dropout window, then apply one make-up gain so
# the loudest moment lands where the report says it does. Same calibration
# trick as the voicemail films: if the mix is unbalanced the probe fails loudly.
# ---------------------------------------------------------------------------
STEMS=(
  "$TMP/bed.stem.wav"
  "$TMP/ping1.stem.wav" "$TMP/ping2.stem.wav" "$TMP/ping3.stem.wav" "$TMP/ping4.stem.wav"
  "$TMP/ping5.stem.wav" "$TMP/ping6.stem.wav" "$TMP/ping7.stem.wav"
  "$TMP/chime.stem.wav" "$TMP/drop.stem.wav"
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
probe=$(window_peak_db "$TMP/probe.wav" 24.5 0.9)
scalar=$(awk -v p="$probe" 'BEGIN{printf "%.4f", 10 ^ ((-10.5 - p) / 20)}')
printf '  unity mix puts the dropout at %s dB, make-up gain x%s\n' "$probe" "$scalar"

mix_with "$scalar" mix.wav
drop_peak=$(window_peak_db mix.wav 24.5 0.9)
awk -v p="$drop_peak" 'BEGIN{ d = p - (-10.5); if (d > 0.6 || d < -0.6) { printf "  dropout landed at %s dB, expected -10.5: mix is unbalanced\n", p; exit 1 } }' \
  || { echo "FATAL: master calibration failed"; exit 1; }

echo
echo "  window levels in mix.wav"
report() { printf '    %-22s mean %7s dB   peak %6s dB\n' "$1" \
  "$("$FF" -hide_banner -nostats -ss "$2" -t "$3" -i mix.wav -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5; exit}')" \
  "$(window_peak_db mix.wav "$2" "$3")"; }
report "0.0-3.0 hook"        0.0  3.0
report "3.0-7.0 distance"    3.0  4.0
report "9.9-11.0 chime"      9.9  1.1
report "13.9-14.3 ping"      13.9 0.4
report "24.4-25.4 dropout"   24.4 1.0
report "27.2-30.0 silence"   27.2 2.8

if command -v "$FP" >/dev/null 2>&1; then
  DURATION=$("$FP" -v error -show_entries format=duration -of csv=p=0 mix.wav)
else
  DURATION=$("$FF" -hide_banner -i mix.wav -f null - 2>&1 \
    | awk -F'time=' '/time=/{t=$2} END{split(t, a, ":"); printf "%.3f", a[1] * 3600 + a[2] * 60 + a[3]}')
fi

echo
printf 'mix.wav  %s s  %s\n' "$DURATION" "$(du -h mix.wav | cut -f1)"

# The film ends on an empty map in dead silence. A rebuild that pads or
# normalises the tail away has broken the ending, so fail loudly.
case "$DURATION" in
  30.000|30.00*) ;;
  *) echo "  expected exactly 30.000 s, got ${DURATION}" >&2; exit 1 ;;
esac

tail_peak=$(window_peak_db mix.wav 27.2 2.8)
awk -v p="$tail_peak" 'BEGIN{ if (p > -80) { printf "  tail is at %s dB, expected silence\n", p; exit 1 } }' \
  || { echo "FATAL: the last 2.8 s are not silent"; exit 1; }
echo "  tail 27.2-30.0 s is silent ✓"
