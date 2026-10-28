#!/usr/bin/env bash
#
# build-audio.sh - assemble the 60 s mix for "Arrived".
#
# Eight voice-over lines and seven pieces of room. Everything under the voice is
# generated here from FFmpeg signal sources: nothing is licensed, nothing needs
# crediting, and a rebuild is byte-identical.
#
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
#   * The voice is fitted to its slot by measurement, not by guess. A tempo
#     outside 0.92-1.18 is printed as a warning and is a reason to rewrite the
#     line or move the slot, not to accept the number.
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
  "$FF" -hide_banner -nostats -nostdin -i "$1" -af volumedetect -f null - 2>&1 \
    | awk '/max_volume/ {print $5; exit}'
}
mean_db() {
  "$FF" -hide_banner -nostats -nostdin -i "$1" -af volumedetect -f null - 2>&1 \
    | awk '/mean_volume/ {print $5; exit}'
}
window_peak_db() { # file start_s duration_s
  "$FF" -hide_banner -nostats -nostdin -ss "$2" -t "$3" -i "$1" -af volumedetect -f null - 2>&1 \
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

echo "bed"
# Room tone: a low hum and a breath of filtered noise, mono, under everything.
q -f lavfi -i "aevalsrc=0.9*sin(2*PI*52*t):s=$SR:d=$DUR" \
  -f lavfi -i "aevalsrc=random(0)*2-1:s=$SR:d=$DUR" \
  -filter_complex "[0]volume=0.05[a];[1]lowpass=420,highpass=60,volume=0.05[b];[a][b]amix=inputs=2:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=55.6:d=0.35[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.raw.wav"
fit "$TMP/bed.raw.wav" -46 mean
place "$TMP/bed.raw.wav" "$TMP/bed.wav" 0 1

echo "voice-over"
# i | start ms | slot seconds
VO_IN=""
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
  awk -v t="$fit_tempo" -v i="$idx" -v s="$slot" -v d="$dur" \
    'BEGIN{ if (t < 0.92 || t > 1.18) printf "  WARNING vo-0%s needs tempo %.3f (%.2fs take in a %.2fs slot)\n", i, t, d, s }'
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
done <<'TABLE'
1|400|6.16
2|7000|4.06
3|12400|3.42
4|21000|3.30
5|27000|4.06
6|35400|3.35
7|44600|3.30
8|52400|3.35
TABLE

echo "map blips"
# The three blips under the zoom: each one is a step further into her own flat.
i=0
for spec in "8200:620:-27" "12500:740:-26" "15600:880:-25"; do
  i=$((i + 1))
  start=$(echo "$spec" | cut -d: -f1)
  hz=$(echo "$spec" | cut -d: -f2)
  level=$(echo "$spec" | cut -d: -f3)
  q -f lavfi -i "aevalsrc=0.6*sin(2*PI*${hz}*t)*exp(-9*t):s=$SR:d=0.8" \
    -af "afade=t=out:st=0.2:d=0.6" -ar "$SR" -ac 1 "$TMP/ping$i.wav"
  fit "$TMP/ping$i.wav" "$level" peak
  place "$TMP/ping$i.wav" "$TMP/ping$i.stem.wav" "$start" 1
done

echo "camera open"
# The feed opens: a relay click and a step down in room, nothing more. A door
# slam here would tell the viewer what to feel before they have seen anything.
q -f lavfi -i "aevalsrc=random(0)*2-1:s=$SR:d=0.22" \
  -af "highpass=900,lowpass=6000,afade=t=in:st=0:d=0.003,afade=t=out:st=0.06:d=0.16,volume=0.6" \
  -ar "$SR" -ac 1 "$TMP/click.wav"
fit "$TMP/click.wav" -24 peak
place "$TMP/click.wav" "$TMP/click.stem.wav" 18050 1

echo "closing blips"
i=3
for spec in "35400:520:-26" "41000:470:-25"; do
  i=$((i + 1))
  start=$(echo "$spec" | cut -d: -f1)
  hz=$(echo "$spec" | cut -d: -f2)
  level=$(echo "$spec" | cut -d: -f3)
  q -f lavfi -i "aevalsrc=0.6*sin(2*PI*${hz}*t)*exp(-8*t):s=$SR:d=1.0" \
    -af "afade=t=out:st=0.3:d=0.7" -ar "$SR" -ac 1 "$TMP/ping$i.wav"
  fit "$TMP/ping$i.wav" "$level" peak
  place "$TMP/ping$i.wav" "$TMP/ping$i.stem.wav" "$start" 1
done

echo "arrival"
# The one hard sound in the film. Two dots become one, and this is what that
# costs: a sub hit and a short band of noise that stops dead.
q -f lavfi -i "aevalsrc=0.9*sin(2*PI*44*t)*exp(-3.2*t):s=$SR:d=2.2" \
  -f lavfi -i "aevalsrc=random(0)*2-1:s=$SR:d=0.35" \
  -filter_complex "[0]volume=1[a];[1]lowpass=1800,highpass=80,afade=t=out:st=0.05:d=0.3,volume=0.5[b];[a][b]amix=inputs=2:dropout_transition=0,afade=t=out:st=1.0:d=1.2[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/thud.raw.wav"
fit "$TMP/thud.raw.wav" -14 peak
place "$TMP/thud.raw.wav" "$TMP/thud.stem.wav" 46000 1

echo "empty hall"
# A hollow tone as the corridor comes back with nobody in it: the room, not a
# sting. If it sounds like a horror trailer the film has been misunderstood.
q -f lavfi -i "aevalsrc=0.5*sin(2*PI*196*t)*exp(-2.4*t):s=$SR:d=3.4" \
  -f lavfi -i "aevalsrc=0.3*sin(2*PI*294*t)*exp(-3.0*t):s=$SR:d=3.4" \
  -filter_complex "[0][1]amix=inputs=2:dropout_transition=0,lowpass=900,afade=t=out:st=1.6:d=1.6[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/hollow.wav"
fit "$TMP/hollow.wav" -29 peak
place "$TMP/hollow.wav" "$TMP/hollow.stem.wav" 51400 1

echo "mix"
MIX="$TMP/mix.wav"
place "$TMP/bed.wav" "$MIX" 0 1

# One amix, not N: mixing pairwise halves the accumulated signal every time, so
# a chain of N mixes buries everything 2^(N-1) down and the make-up gain
# becomes a guess. A single amix divides by N, which is exact.
STEMS=("$MIX" $VO_IN)
for stem in "$TMP"/ping*.stem.wav "$TMP/click.stem.wav" "$TMP/thud.stem.wav" "$TMP/hollow.stem.wav"; do
  STEMS+=("$stem")
done
inputs=${#STEMS[@]}
args=()
for stem in "${STEMS[@]}"; do args+=(-i "$stem"); done
q "${args[@]}" -filter_complex "amix=inputs=$inputs:dropout_transition=0,volume=$inputs,alimiter=limit=0.89:level=0" \
  -ar "$SR" -ac 1 -c:a pcm_s16le "$TMP/sum.wav"

# Then one measurement: put the voice, not the peak, where it belongs.
vo_peak=$(window_peak_db "$TMP/sum.wav" 0.4 6.4)
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
printf '  voice (0.4-6.4)     peak %s dB\n' "$(window_peak_db mix.wav 0.4 6.0)"
printf '  arrival (46.0-47.5) peak %s dB\n' "$(window_peak_db mix.wav 46.0 1.5)"
