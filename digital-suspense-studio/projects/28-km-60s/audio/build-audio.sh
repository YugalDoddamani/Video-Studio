#!/usr/bin/env bash
#
# build-audio.sh - assemble the 60 s mix for "2.8 km" (narrated).
#
# The film has a voice-over, so the voice is the mix: nine takes, placed on the
# frame each line was written for. Everything under it - the room, seven
# proximity pings, one chime, one dropout, one wake tick - is generated here
# from FFmpeg signal sources. Nothing is licensed and nothing needs crediting.
#
#   ./build-audio.sh              writes audio/mix.wav (mono 48 kHz, 60.00 s)
#
# Requires ffmpeg + ffprobe on PATH, or:
#   FFMPEG=/path/to/ffmpeg FFPROBE=/path/to/ffprobe ./build-audio.sh
#
# Three things this script knows that are worth keeping:
#
#   * Noise comes from aevalsrc's random(), not anoisesrc: this build has no
#     seedable noise source, so anoisesrc returns a different file every run.
#     random() is deterministic, which keeps a rebuild byte-identical.
#   * Levels are FITTED BY MEASUREMENT, never trusted from the generator.
#     `sine` renders at -18 dBFS here, not full scale, and `amix` divides by
#     its input count, so every element is scaled until its measured level is
#     the number written next to it.
#   * The voice is slowed to fit its slot, not the slot to the voice: TTS
#     reads at its own pace, so each take is measured and time-stretched by
#     exactly the ratio that lands it inside the window it was written for.
#     A stretch outside 0.92-1.18 is printed as a warning and is a reason to
#     rewrite the line, not to accept the number.
#
set -euo pipefail
cd "$(dirname "$0")"

FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"
SR=48000
DUR=60
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# -nostdin matters: without it ffmpeg reads the loop's heredoc out from under
# `read`, and the voice-over table is consumed three lines at a time.
q() { "$FF" -y -hide_banner -loglevel error -nostdin "$@"; }

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

# fit <file> <target_db> [peak|mean]
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

# place <src> <out> <start_ms> <gain>
place() {
  q -i "$1" -af "volume=$4,adelay=$3,apad" -ar "$SR" -ac 1 -c:a pcm_s16le -t "$DUR" "$2"
}

# mix2 <a> <b> <out> - amix halves both inputs; the make-up gain comes once, at
# the end, from the measured voice peak, so nothing here has to guess.
mix2() {
  q -i "$1" -i "$2" -filter_complex "[0][1]amix=inputs=2:dropout_transition=0" \
    -ar "$SR" -ac 1 -c:a pcm_s16le "$3"
}

echo "bed"
# Room tone: a low hum and a breath of filtered noise, mono, under everything.
q -f lavfi -i "aevalsrc=0.9*sin(2*PI*52*t):s=$SR:d=$DUR" \
  -f lavfi -i "aevalsrc=random(0)*2-1:s=$SR:d=$DUR" \
  -filter_complex "[0]volume=0.05[a];[1]lowpass=420,highpass=60,volume=0.05[b];[a][b]amix=inputs=2:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=55.6:d=0.35[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.raw.wav"
fit "$TMP/bed.raw.wav" -46 mean
place "$TMP/bed.raw.wav" "$TMP/bed.wav" 0 1

echo "voice-over"
# i | start ms | slot seconds | take
VO_IN=""
VO_COUNT=0
while IFS='|' read -r idx start slot; do
  [ -z "$idx" ] && continue
  src="vo-0${idx}.mp3"
  [ -f "$src" ] || { echo "  missing $src"; exit 1; }
  raw="$TMP/vo$idx.raw.wav"
  q -i "$src" -af "aformat=channel_layouts=mono,aresample=$SR" -ar "$SR" -ac 1 "$raw"
  dur=$("$FP" -v error -show_entries format=duration -of csv=p=0 "$raw")
  # Pitch: -1.2 semitones, then undo the speed change so the take keeps its
  # natural delivery. asetrate lowers pitch AND duration; atempo restores it.
  rate=$(awk -v s="$SR" 'BEGIN{printf "%d", s * 0.9330}')
  pitch_tempo=$(awk 'BEGIN{printf "%.4f", 1 / 0.9330}')
  fit_tempo=$(awk -v d="$dur" -v s="$slot" 'BEGIN{printf "%.4f", d / s}')
  awk -v t="$fit_tempo" 'BEGIN{ if (t < 0.92 || t > 1.18) printf "  WARNING vo-0%s needs tempo %.3f (slot %.2fs)\n", "'"$idx"'", t, '"$slot"' }'
  total=$(awk -v a="$pitch_tempo" -v b="$fit_tempo" 'BEGIN{printf "%.4f", a * b}')
  trimmed="$TMP/vo$idx.fit.wav"
  q -i "$raw" -af "asetrate=$rate,aresample=$SR,atempo=$total,highpass=85,lowpass=9500,acompressor=threshold=0.12:ratio=2.5:attack=8:release=180,alimiter=limit=0.95:level=0" "$trimmed"
  # 40 ms ghost: the same voice, one room-reflection late.
  q -i "$trimmed" -filter_complex "[0]asplit=2[a][b];[b]adelay=40,volume=0.28[g];[a][g]amix=inputs=2:dropout_transition=0[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$trimmed.ghost.wav"
  mv "$trimmed.ghost.wav" "$trimmed"
  fit "$trimmed" -8 peak
  place "$trimmed" "$TMP/vo$idx.stem.wav" "$start" 1
  VO_IN="$VO_IN $TMP/vo$idx.stem.wav"
  VO_COUNT=$((VO_COUNT + 1))
done <<'TABLE'
1|400|5.10
2|6000|4.70
3|12400|4.30
4|22000|7.40
5|32000|2.30
6|36000|6.20
7|46600|3.50
8|51600|1.90
9|55200|4.00
TABLE

echo "pings"
# Seven proximity pings, one per beat of the countdown, climbing in pitch.
PING_MS="5800 11600 20600 30000 34600 44800 51000"
PING_HZ="660 740 830 930 1040 1170 1310"
PING_DB="-27 -26 -26 -25 -24 -24 -23"
i=0
for start in $PING_MS; do
  i=$((i + 1))
  hz=$(echo $PING_HZ | cut -d' ' -f$i)
  level=$(echo $PING_DB | cut -d' ' -f$i)
  q -f lavfi -i "aevalsrc=0.6*sin(2*PI*${hz}*t)*exp(-7*t):s=$SR:d=1.2" \
    -af "afade=t=out:st=0.35:d=0.85" -ar "$SR" -ac 1 "$TMP/ping$i.wav"
  fit "$TMP/ping$i.wav" "$level" peak
  place "$TMP/ping$i.wav" "$TMP/ping$i.stem.wav" "$start" 1
done

echo "chime"
# One two-tone chime: the sister's reply.
q -f lavfi -i "aevalsrc=0.45*sin(2*PI*1046*t)*exp(-5*t):s=$SR:d=1.6" \
  -f lavfi -i "aevalsrc=0.30*sin(2*PI*1568*t)*exp(-5*t):s=$SR:d=1.6" \
  -filter_complex "[0][1]amix=inputs=2:dropout_transition=0,afade=t=out:st=0.7:d=0.9[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/chime.wav"
fit "$TMP/chime.wav" -26 peak
place "$TMP/chime.wav" "$TMP/chime.stem.wav" 39900 1

echo "dropout"
# The screen dies: a click, then a short burst of noise that stops dead.
q -f lavfi -i "aevalsrc=random(0)*2-1:s=$SR:d=0.9" \
  -af "highpass=300,lowpass=5200,afade=t=in:st=0:d=0.004,afade=t=out:st=0.35:d=0.5,volume=0.5" \
  -ar "$SR" -ac 1 "$TMP/dropout.wav"
fit "$TMP/dropout.wav" -19 peak
place "$TMP/dropout.wav" "$TMP/dropout.stem.wav" 56050 1

echo "wake tick"
q -f lavfi -i "aevalsrc=0.5*sin(2*PI*2400*t)*exp(-60*t):s=$SR:d=0.3" -ar "$SR" -ac 1 "$TMP/tick.wav"
fit "$TMP/tick.wav" -33 peak
place "$TMP/tick.wav" "$TMP/tick.stem.wav" 57550 1

echo "mix"
MIX="$TMP/mix.wav"
place "$TMP/bed.wav" "$MIX" 0 1

# One amix, not nineteen: mixing pairwise halves the accumulated signal every
# time, so a chain of N mixes buries everything 2^(N-1) down and the make-up
# gain becomes a guess. A single amix divides by N, which is exact.
STEMS=("$MIX" $VO_IN)
for stem in "$TMP"/ping*.stem.wav "$TMP/chime.stem.wav" "$TMP/dropout.stem.wav" "$TMP/tick.stem.wav"; do
  STEMS+=("$stem")
done
inputs=${#STEMS[@]}
args=()
for stem in "${STEMS[@]}"; do args+=(-i "$stem"); done
q "${args[@]}" -filter_complex "amix=inputs=$inputs:dropout_transition=0,volume=$inputs,alimiter=limit=0.89:level=0" \
  -ar "$SR" -ac 1 -c:a pcm_s16le "$TMP/sum.wav"

# Then one measurement: put the voice, not the peak, where it belongs.
vo_peak=$(window_peak_db "$TMP/sum.wav" 0.4 5.0)
master=$(awk -v m="$vo_peak" 'BEGIN{printf "%.4f", 10 ^ ((-3.0 - m) / 20)}')
q -i "$TMP/sum.wav" -af "volume=$master,alimiter=limit=0.95:level=0,afade=t=out:st=59.4:d=0.6" \
  -ar "$SR" -ac 1 -c:a pcm_s16le mix.wav

echo
echo "report"
printf '  voice window peak   %s dB -> master %s\n' "$vo_peak" "$master"
printf '  file %s  %s s  peak %s dBFS  mean %s dB\n' \
  "mix.wav" "$("$FP" -v error -show_entries format=duration -of csv=p=0 mix.wav)" \
  "$(peak_db mix.wav)" "$(mean_db mix.wav)"
printf '  tail (59.4-60.0) peak %s dB\n' "$(window_peak_db mix.wav 59.4 0.6)"
printf '  voice (0.4-5.5)     peak %s dB\n' "$(window_peak_db mix.wav 0.4 5.1)"
printf '  dead room (57.2-59.3) peak %s dB (voice runs here)\n' "$(window_peak_db mix.wav 57.2 2.1)"
