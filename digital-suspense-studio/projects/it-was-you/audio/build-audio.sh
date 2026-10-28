#!/usr/bin/env bash
#
# build-audio.sh - assemble the 30 s mix for "It Was You" (part 4, the last one).
#
# vo-01 is part 1's opening take, reused byte-for-byte: the message that is
# left in this film is the message that arrives in that one. vo-02 is the only
# new line. Everything else (room tone, line hiss, footsteps walking away, the
# phone being picked up, the record tick, the notification that closes the
# loop) is built from FFmpeg signal generators.
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
# fit_vo <file> <mean_db> <peak_ceiling_db> - level a take by its mean, but
# never let a punchy syllable end up within 5 dB of the loudest hit in the film.
# Without the ceiling a short take with little silence gets a gain that puts its
# consonants at -1 dB, and the whole mix has to be calibrated around that.
fit_vo() {
  local file="$1" target="$2" ceiling="$3" mean peak gain_mean gain_peak gain
  mean=$(mean_db "$file"); peak=$(peak_db "$file")
  case "$mean" in ''|-inf|-91.0) echo "  (unmeasurable: $file, left alone)"; return 0 ;; esac
  gain_mean=$(awk -v t="$target" -v m="$mean" 'BEGIN{printf "%.6f", 10 ^ ((t - m) / 20)}')
  gain_peak=$(awk -v c="$ceiling" -v p="$peak" 'BEGIN{printf "%.6f", 10 ^ ((c - p) / 20)}')
  gain=$(awk -v a="$gain_mean" -v b="$gain_peak" 'BEGIN{printf "%.6f", (a < b ? a : b)}')
  q -i "$file" -af "volume=$gain" -c:a pcm_s16le "$file.fit.wav"
  mv "$file.fit.wav" "$file"
}

place() {
  q -i "$1" -af "volume=$4,adelay=$3,apad" -ar "$SR" -ac 1 -c:a pcm_s16le -t "$DUR" "$2"
}

# ---------------------------------------------------------------------------
# 1. Voice-over
#
# Same chain, but this voice is closer to the microphone than in parts 1-3:
# the band is a little wider and there is almost no ghost, because it is being
# recorded into a phone, not played down a line.
# ---------------------------------------------------------------------------
VO_CHAIN="aformat=channel_layouts=mono,aresample=${SR},asetrate=41563,aresample=${SR},atempo=1.1549,highpass=150,lowpass=4200,acrusher=bits=13:mix=0.18,acompressor=threshold=0.14:ratio=3:attack=6:release=160,alimiter=limit=0.9:level=0"

proc() {
  local src="$1" out="$2" tempo="$3"
  local chain="$VO_CHAIN"
  [ "$tempo" != "1" ] && chain="${chain},atempo=${tempo}"
  q -i "$src" -filter_complex \
    "[0:a]${chain}[p];[p]asplit=2[a][b];[b]adelay=28,volume=0.45[g];[a][g]amix=inputs=2:dropout_transition=0[out]" \
    -map "[out]" -ar "$SR" -ac 1 -c:a pcm_s16le "$out"
}

vo_stem() {
  local name="$1" start="$2" tempo="$3"
  proc "$name.mp3" "$TMP/${name}.proc.wav" "$tempo"
  local before
  before=$(mean_db "$TMP/${name}.proc.wav")
  fit_vo "$TMP/${name}.proc.wav" -22 -6
  place "$TMP/${name}.proc.wav" "$TMP/${name}.stem.wav" "$start" 1
  printf '  %-6s start %5d ms  tempo %-4s  raw %6s dB mean -> -22 dB, peak capped at -6\n' "$name" "$start" "$tempo" "$before"
}

echo "voice-over"
# Part 1's opening line, unchanged: this is where it comes from.
vo_stem vo-01 20400 1.00
vo_stem vo-02 24400 1.00

# ---------------------------------------------------------------------------
# 2. Room tone - dead by 27.0 s, because the last three seconds are the lock
#    screen and the notification that starts part 1.
# ---------------------------------------------------------------------------
echo "room tone"
q -f lavfi -i "${TONE52}:d=27.1" \
  -f lavfi -i "${TONE104}:d=27.1" \
  -f lavfi -i "${NOISE}:d=27.1" \
  -filter_complex "[0]volume=0.055[a];[1]volume=0.022[b];[2]lowpass=260,highpass=32,volume=0.05[c];[a][b][c]amix=inputs=3:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=26.87:d=0.13[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.wav"
fit "$TMP/bed.wav" -46 mean

# ---------------------------------------------------------------------------
# 3. Line hiss - the call is still connected until the phone is picked up at
#    11.4 s, which is the only reason the first eleven seconds sound like a
#    phone lying on a floor.
# ---------------------------------------------------------------------------
echo "line hiss"
q -f lavfi -i "${NOISE}:d=11.5" \
  -af "highpass=420,lowpass=5200,volume=0.30,afade=t=in:st=0:d=0.5,afade=t=out:st=11.26:d=0.22" \
  -ar "$SR" -ac 1 "$TMP/hiss.wav"
fit "$TMP/hiss.wav" -42 mean

# ---------------------------------------------------------------------------
# 4. Footsteps walking away from the phone: four, each quieter than the last.
# ---------------------------------------------------------------------------
echo "footsteps"
q -f lavfi -i "${NOISE}:d=0.10" -f lavfi -i "aevalsrc=0.9*sin(2*PI*54*t):s=${SR}:d=0.18" \
  -filter_complex "[0]lowpass=1100,highpass=70,afade=t=out:st=0.004:d=0.09:curve=exp,volume=0.45[a];[1]afade=t=in:st=0:d=0.003,afade=t=out:st=0.02:d=0.16:curve=exp,volume=0.75[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/step.raw.wav"
fit "$TMP/step.raw.wav" -20 peak

step_stems=()
i=0
for t in 3000 4120 5240 6360; do
  i=$((i + 1))
  gain=$(awk -v i="$i" 'BEGIN{printf "%.3f", 1.0 - i * 0.16}')
  place "$TMP/step.raw.wav" "$TMP/step${i}.stem.wav" "$t" "$gain"
  step_stems+=("$TMP/step${i}.stem.wav")
done

# ---------------------------------------------------------------------------
# 5. The phone is picked up at 11.40 s: a plastic scrape, then the call is
#    gone and the corridor is close and dry.
# ---------------------------------------------------------------------------
echo "pick up"
q -f lavfi -i "${NOISE}:d=0.34" -f lavfi -i "aevalsrc=0.9*sin(2*PI*120*t):s=${SR}:d=0.2" \
  -filter_complex "[0]highpass=900,lowpass=6800,afade=t=in:st=0:d=0.02,afade=t=out:st=0.06:d=0.28:curve=exp,volume=0.5[a];[1]afade=t=in:st=0:d=0.002,afade=t=out:st=0.02:d=0.16:curve=exp,volume=0.4[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/pickup.raw.wav"
fit "$TMP/pickup.raw.wav" -14 peak
place "$TMP/pickup.raw.wav" "$TMP/pickup.stem.wav" 11400 1

# ---------------------------------------------------------------------------
# 6. Record starts at 20.00 s - a click, not a beep.
# ---------------------------------------------------------------------------
echo "record start"
q -f lavfi -i "${NOISE}:d=0.05" \
  -af "highpass=1400,lowpass=7200,afade=t=out:st=0.003:d=0.045:curve=exp" \
  -ar "$SR" -ac 1 "$TMP/tick.raw.wav"
fit "$TMP/tick.raw.wav" -16 peak
place "$TMP/tick.raw.wav" "$TMP/tick.stem.wav" 20000 1

# ---------------------------------------------------------------------------
# 7. The notification that ends the film at 27.30 s - the same chime part 1
#    opens with, because this is that notification.
# ---------------------------------------------------------------------------
echo "chime"
q -f lavfi -i "aevalsrc=0.9*sin(2*PI*1046.5*t):s=${SR}:d=1.2" \
  -f lavfi -i "aevalsrc=0.9*sin(2*PI*1568*t):s=${SR}:d=1.2" \
  -filter_complex "[0]afade=t=in:st=0:d=0.004,afade=t=out:st=0.03:d=0.62:curve=exp,volume=0.5[a];[1]afade=t=in:st=0:d=0.004,afade=t=out:st=0.02:d=0.55:curve=exp,adelay=52,volume=0.38[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/chime.raw.wav"
fit "$TMP/chime.raw.wav" -4 peak
place "$TMP/chime.raw.wav" "$TMP/chime.stem.wav" 27300 1

# ---------------------------------------------------------------------------
# 8. Master - calibrated on the chime, which must land on -4.0 dBFS.
# ---------------------------------------------------------------------------
STEMS=(
  "$TMP/bed.wav" "$TMP/hiss.wav" "${step_stems[@]}"
  "$TMP/pickup.stem.wav" "$TMP/tick.stem.wav"
  "$TMP/vo-01.stem.wav" "$TMP/vo-02.stem.wav" "$TMP/chime.stem.wav"
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
probe=$(window_peak_db "$TMP/probe.wav" 27.3 0.6)
scalar=$(awk -v p="$probe" 'BEGIN{printf "%.4f", 10 ^ ((-4.0 - p) / 20)}')
printf '  unity mix puts the chime at %s dB, make-up gain x%s\n' "$probe" "$scalar"

mix_with "$scalar" mix.wav
chime_peak=$(window_peak_db mix.wav 27.3 0.6)
awk -v p="$chime_peak" 'BEGIN{ d = p - (-4.0); if (d > 0.6 || d < -0.6) { printf "  chime landed at %s dB, expected -4.0: mix is unbalanced\n", p; exit 1 } }' \
  || { echo "FATAL: master calibration failed"; exit 1; }

echo
echo "  window levels in mix.wav"
report() { printf '    %-22s mean %7s dB   peak %6s dB\n' "$1" \
  "$("$FF" -hide_banner -nostats -ss "$2" -t "$3" -i mix.wav -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5; exit}')" \
  "$(window_peak_db mix.wav "$2" "$3")"; }
report "0.0-11.4 floor"        0     11.4
report "11.4-11.7 pick up"     11.4  0.3
report "20.4-24.4 message"     20.4  4
report "27.3-27.9 chime"       27.3  0.6
report "28.2-30.0 silence"     28.2  1.8

if command -v "$FP" >/dev/null 2>&1; then
  DURATION=$("$FP" -v error -show_entries format=duration -of csv=p=0 mix.wav)
else
  DURATION=$("$FF" -hide_banner -i mix.wav -f null - 2>&1 \
    | awk -F'time=' '/time=/{t=$2} END{split(t, a, ":"); printf "%.3f", a[1] * 3600 + a[2] * 60 + a[3]}')
fi

echo
printf 'mix.wav  %s s  %s\n' "$DURATION" "$(du -h mix.wav | cut -f1)"
case "$DURATION" in
  30.000|30.00*) ;;
  *) echo "  expected exactly 30.000 s, got ${DURATION}" >&2; exit 1 ;;
esac
