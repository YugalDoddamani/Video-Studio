#!/usr/bin/env bash
#
# build-audio.sh - assemble the 30 s mix for "It's Inside" (part 3).
#
# The five vo-*.mp3 takes are text-to-speech; everything else (room tone, phone
# line hiss, the eight footsteps that walk up the corridor, the hand that takes
# the phone, the front door and the latch) is built from FFmpeg signal
# generators. No third-party audio, nothing to license.
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
# The same chain as parts 1 and 2 - this is the same voice on an even worse
# line: pitch down 2.5 semitones, bit-crush, a narrower telephone band because
# the phone is now inside the house, compress/limit, and a 40 ms ghost copy.
# ---------------------------------------------------------------------------
VO_CHAIN="aformat=channel_layouts=mono,aresample=${SR},asetrate=41563,aresample=${SR},atempo=1.1549,highpass=240,lowpass=3200,acrusher=bits=13:mix=0.22,acompressor=threshold=0.12:ratio=3:attack=6:release=140,alimiter=limit=0.9:level=0"

# proc <src> <out> <tempo> [max_seconds]
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

# vo_stem <name> <start_ms> <tempo> [max_seconds]
vo_stem() {
  local name="$1" start="$2" tempo="$3" maxs="${4:-}"
  proc "$name.mp3" "$TMP/${name}.proc.wav" "$tempo" "$maxs"
  local before
  before=$(mean_db "$TMP/${name}.proc.wav")
  fit_vo "$TMP/${name}.proc.wav" -22 -6
  place "$TMP/${name}.proc.wav" "$TMP/${name}.stem.wav" "$start" 1
  printf '  %-6s start %5d ms  tempo %-4s  raw %6s dB mean -> -22 dB, peak capped at -6\n' "$name" "$start" "$tempo" "$before"
}

echo "voice-over"
vo_stem vo-01  3400 1.00
vo_stem vo-02  9400 1.04
vo_stem vo-03 15200 1.02
vo_stem vo-04 18600 1.05
# "Too late" is grabbed by the hand that covers the lens at 23.87 s.
vo_stem vo-05 22600 1.06 1.27

# ---------------------------------------------------------------------------
# 2. Room tone - the same fridge hum as parts 1 and 2, dead by 28.2 s so the
#    last 1.8 s of the film is true silence.
# ---------------------------------------------------------------------------
echo "room tone"
q -f lavfi -i "${TONE52}:d=28.3" \
  -f lavfi -i "${TONE104}:d=28.3" \
  -f lavfi -i "${NOISE}:d=28.3" \
  -filter_complex "[0]volume=0.055[a];[1]volume=0.022[b];[2]lowpass=260,highpass=32,volume=0.05[c];[a][b][c]amix=inputs=3:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=28.07:d=0.13[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.wav"
fit "$TMP/bed.wav" -46 mean

# ---------------------------------------------------------------------------
# 3. Phone-line hiss - the call is still up. It stops at 26.0 s, which is when
#    the call ends, and leaves the room completely dead after the latch.
# ---------------------------------------------------------------------------
echo "line hiss"
q -f lavfi -i "${NOISE}:d=26.1" \
  -af "highpass=420,lowpass=5200,volume=0.30,afade=t=in:st=0:d=0.6,afade=t=out:st=25.94:d=0.16" \
  -ar "$SR" -ac 1 "$TMP/hiss.wav"
fit "$TMP/hiss.wav" -42 mean

# ---------------------------------------------------------------------------
# 4. Footsteps - the person holding the phone is walking down the corridor
#    towards you. Eight of them on wood, close to the mic, 1.06 s apart.
# ---------------------------------------------------------------------------
echo "footsteps"
q -f lavfi -i "${NOISE}:d=0.10" -f lavfi -i "aevalsrc=0.9*sin(2*PI*54*t):s=${SR}:d=0.18" \
  -filter_complex "[0]lowpass=1100,highpass=70,afade=t=out:st=0.004:d=0.09:curve=exp,volume=0.45[a];[1]afade=t=in:st=0:d=0.003,afade=t=out:st=0.02:d=0.16:curve=exp,volume=0.75[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/step.raw.wav"
fit "$TMP/step.raw.wav" -18 peak

step_stems=()
i=0
for t in 1500 2560 3620 4680 5740 6800 7860 8920; do
  i=$((i + 1))
  gain=$(awk -v i="$i" 'BEGIN{printf "%.3f", 0.62 + i * 0.05}')
  place "$TMP/step.raw.wav" "$TMP/step${i}.stem.wav" "$t" "$gain"
  step_stems+=("$TMP/step${i}.stem.wav")
done

# ---------------------------------------------------------------------------
# 5. The hand that takes the phone, at 23.87 s - the loudest thing in the film.
# ---------------------------------------------------------------------------
echo "grab"
q -f lavfi -i "${NOISE}:d=0.16" -f lavfi -i "aevalsrc=0.9*sin(2*PI*62*t):s=${SR}:d=0.26" \
  -filter_complex "[0]highpass=380,lowpass=5200,acrusher=bits=7:mix=0.3,afade=t=out:st=0.012:d=0.15:curve=exp,volume=0.65[a];[1]afade=t=in:st=0:d=0.002,afade=t=out:st=0.03:d=0.23:curve=exp,volume=0.9[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.97:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/grab.raw.wav"
fit "$TMP/grab.raw.wav" -1 peak
place "$TMP/grab.raw.wav" "$TMP/grab.stem.wav" 23870 1

# ---------------------------------------------------------------------------
# 6. The front door, from inside, at 25.40 s.
# ---------------------------------------------------------------------------
echo "front door"
q -f lavfi -i "${NOISE}:d=0.42" -f lavfi -i "aevalsrc=0.9*sin(2*PI*48*t):s=${SR}:d=0.40" \
  -filter_complex "[0]lowpass=900,highpass=40,afade=t=out:st=0.02:d=0.40:curve=exp,volume=0.6[a];[1]afade=t=in:st=0:d=0.004,afade=t=out:st=0.05:d=0.35:curve=exp,volume=0.85[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.97:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/door.raw.wav"
fit "$TMP/door.raw.wav" -3.5 peak
place "$TMP/door.raw.wav" "$TMP/door.stem.wav" 25400 1

# ---------------------------------------------------------------------------
# 7. The latch, at 27.30 s - the last thing before the card and the silence.
# ---------------------------------------------------------------------------
echo "latch"
q -f lavfi -i "${NOISE}:d=0.07" \
  -af "highpass=900,lowpass=6400,afade=t=out:st=0.004:d=0.06:curve=exp" \
  -ar "$SR" -ac 1 "$TMP/latch.raw.wav"
fit "$TMP/latch.raw.wav" -12 peak
place "$TMP/latch.raw.wav" "$TMP/latch.stem.wav" 27300 1

# ---------------------------------------------------------------------------
# 8. Master
#
# 15 stems go into amix. Whether that averages or sums depends on the FFmpeg
# build, so the make-up gain is MEASURED, not assumed: mix once at unity, read
# the grab window (which must land on -1.0 dBFS), then scale by the error.
# ---------------------------------------------------------------------------
STEMS=(
  "$TMP/bed.wav" "$TMP/hiss.wav" "${step_stems[@]}"
  "$TMP/vo-01.stem.wav" "$TMP/vo-02.stem.wav" "$TMP/vo-03.stem.wav"
  "$TMP/vo-04.stem.wav" "$TMP/vo-05.stem.wav"
  "$TMP/grab.stem.wav" "$TMP/door.stem.wav" "$TMP/latch.stem.wav"
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
probe=$(window_peak_db "$TMP/probe.wav" 23.87 0.32)
scalar=$(awk -v p="$probe" 'BEGIN{printf "%.4f", 10 ^ ((-1.0 - p) / 20)}')
printf '  unity mix puts the grab at %s dB, make-up gain x%s\n' "$probe" "$scalar"

mix_with "$scalar" mix.wav
grab_peak=$(window_peak_db mix.wav 23.87 0.32)
awk -v p="$grab_peak" 'BEGIN{ d = p - (-1.0); if (d > 0.6 || d < -0.6) { printf "  grab landed at %s dB, expected -1.0: mix is unbalanced\n", p; exit 1 } }' \
  || { echo "FATAL: master calibration failed"; exit 1; }

echo
echo "  window levels in mix.wav"
report() { printf '    %-22s mean %7s dB   peak %6s dB\n' "$1" \
  "$("$FF" -hide_banner -nostats -ss "$2" -t "$3" -i mix.wav -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5; exit}')" \
  "$(window_peak_db mix.wav "$2" "$3")"; }
report "0.0-3.4 corridor"      0     3.4
report "3.4-21.0 the call"     3.4   17.6
report "23.87-24.19 grab"      23.87 0.32
report "25.4-25.8 front door"  25.4  0.4
report "27.3-27.4 latch"       27.3  0.1
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
