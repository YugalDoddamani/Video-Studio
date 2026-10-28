#!/usr/bin/env bash
#
# build-audio.sh - assemble the 30 s mix for "You Answer" (part 2).
#
# Everything here is synthesised or generated: the six vo-*.mp3 takes are
# text-to-speech (vo-01 is the one line carried over from part 1), and every
# other sound - the room, the line hiss, the switch, the static, the knocks and
# the latch - comes out of FFmpeg signal generators. No third-party audio is
# used, so there is no sample to license and nothing to credit.
#
#   ./build-audio.sh              writes audio/mix.wav (mono 48 kHz, 30.00 s)
#
# Requires ffmpeg + ffprobe on PATH, or:
#   FFMPEG=/path/to/ffmpeg FFPROBE=/path/to/ffprobe ./build-audio.sh
#
# Three things this script knows about FFmpeg that are worth keeping:
#
#   * Noise comes from aevalsrc's random(), not anoisesrc. This build has no
#     seedable noise source, so anoisesrc returns a different file every run.
#     random() is deterministic, which keeps a rebuild byte-identical.
#   * Levels are FITTED BY MEASUREMENT, never trusted from the generator.
#     `sine` renders at -18 dBFS here (not full scale), and `amix` divides by
#     its input count. Every element is scaled until its measured peak or mean
#     hits the number written next to it.
#   * The master make-up gain is measured too, not assumed: the mix is built at
#     unity, the static window is read, and everything is scaled by exactly the
#     error so the loudest moment of the film lands on -0.5 dBFS.
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
# Same "you, but wrong" treatment as part 1 - pitch down 2.5 semitones, a
# little bit-crush, a compress/limit pass and a 40 ms ghost copy - except that
# the band is narrower (240 Hz - 3.2 kHz), because in this film the voice comes
# down a phone line, not out of a voicemail player.
# ---------------------------------------------------------------------------
VO_CHAIN="aformat=channel_layouts=mono,aresample=${SR},asetrate=41563,aresample=${SR},atempo=1.1549,highpass=240,lowpass=3200,acrusher=bits=13:mix=0.2,acompressor=threshold=0.12:ratio=3:attack=6:release=140,alimiter=limit=0.9:level=0"

# proc <src> <out> <tempo> [max_seconds]
# Renders the take, layers the ghost, and can hard-cut the tail: vo-06 is
# chopped mid-word by the static at 21.00 s, exactly like part 1's cut-off.
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
  fit "$TMP/${name}.proc.wav" -21 mean
  place "$TMP/${name}.proc.wav" "$TMP/${name}.stem.wav" "$start" 1
  printf '  %-6s start %5d ms  tempo %-4s  raw %6s dB mean -> -21 dB\n' "$name" "$start" "$tempo" "$before"
}

echo "voice-over"
# The first line is the voicemail's first line, reused: the call opens with the
# exact words from part 1, so the voice is provably the same voice.
vo_stem vo-01  3400 1.00
vo_stem vo-02  9400 1.05
vo_stem vo-03 13000 1.05
vo_stem vo-04 16600 1.10
vo_stem vo-05 18600 1.15
# "Turn around." gets 0.57 s before the static takes it.
vo_stem vo-06 20430 1.00 0.57

# ---------------------------------------------------------------------------
# 2. Room tone - the same fridge hum as part 1, but it dies with the picture
#    at 21.0 s. After that there is only the line.
# ---------------------------------------------------------------------------
echo "room tone"
q -f lavfi -i "${TONE52}:d=21.2" \
  -f lavfi -i "${TONE104}:d=21.2" \
  -f lavfi -i "${NOISE}:d=21.2" \
  -filter_complex "[0]volume=0.055[a];[1]volume=0.022[b];[2]lowpass=260,highpass=32,volume=0.05[c];[a][b][c]amix=inputs=3:dropout_transition=0,lowpass=520,afade=t=in:st=0:d=0.8,afade=t=out:st=20.9:d=0.2[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/bed.raw.wav"
fit "$TMP/bed.raw.wav" -46 mean
place "$TMP/bed.raw.wav" "$TMP/bed.stem.wav" 0 1

# ---------------------------------------------------------------------------
# 3. Line hiss - the call is open. It is almost inaudible under the voice and
#    it is the only thing left once the picture dies. Dropped at 26.0 s, which
#    is the sound of the call ending: the knocks start right after it.
# ---------------------------------------------------------------------------
echo "line hiss"
q -f lavfi -i "${NOISE}:d=26" \
  -af "highpass=420,lowpass=5200,volume=0.6,afade=t=in:st=0:d=0.25,afade=t=out:st=25.99:d=0.01" \
  -ar "$SR" -ac 1 "$TMP/hiss.raw.wav"
# -42 dB mean: audible presence under the voice, and the only thing left in the
# room once the picture dies. Twenty dB under the voice is inaudible as hiss.
fit "$TMP/hiss.raw.wav" -42 mean
place "$TMP/hiss.raw.wav" "$TMP/hiss.stem.wav" 0 1

# ---------------------------------------------------------------------------
# 4. Static at 21.00 s - the loudest moment in the film. Same burst as part 1,
#    because it is the same failure.
# ---------------------------------------------------------------------------
echo "static"
q -f lavfi -i "${NOISE}:d=1.10" \
  -af "highpass=300,lowpass=7600,acrusher=bits=5:mix=0.35,afade=t=in:st=0:d=0.004,afade=t=out:st=0.42:d=0.66,alimiter=limit=0.99:level=0" \
  -ar "$SR" -ac 1 "$TMP/static.raw.wav"
fit "$TMP/static.raw.wav" -0.5 peak
place "$TMP/static.raw.wav" "$TMP/static.stem.wav" 21000 1

# ---------------------------------------------------------------------------
# 5. The switch - the hallway light under the door going out at 15.4 s. A real
#    switch in a real house: a hard little tick and nothing else.
# ---------------------------------------------------------------------------
echo "switch"
q -f lavfi -i "${NOISE}:d=0.05" \
  -af "highpass=1600,lowpass=9000,afade=t=out:st=0.006:d=0.04:curve=exp" \
  -ar "$SR" -ac 1 "$TMP/switch.raw.wav"
fit "$TMP/switch.raw.wav" -28 peak
place "$TMP/switch.raw.wav" "$TMP/switch.stem.wav" 15400 1

# ---------------------------------------------------------------------------
# 6. Knocks - three, half a second apart, from INSIDE the room this time: the
#    same knock as part 1 with the bottom end kept, because these are close.
# ---------------------------------------------------------------------------
echo "knocks"
q -f lavfi -i "${NOISE}:d=0.09" -f lavfi -i "aevalsrc=0.9*sin(2*PI*68*t):s=${SR}:d=0.16" \
  -filter_complex "[0]lowpass=1900,highpass=70,afade=t=out:st=0.006:d=0.08:curve=exp,volume=0.7[a];[1]afade=t=in:st=0:d=0.002,afade=t=out:st=0.012:d=0.145:curve=exp,volume=0.9[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/knock.raw.wav"
fit "$TMP/knock.raw.wav" -6 peak
place "$TMP/knock.raw.wav" "$TMP/knock1.stem.wav" 26400 0.9
place "$TMP/knock.raw.wav" "$TMP/knock2.stem.wav" 26900 0.96
place "$TMP/knock.raw.wav" "$TMP/knock3.stem.wav" 27400 1.0

# ---------------------------------------------------------------------------
# 7. The latch at 27.85 s - the door behind you opening. It lands a quarter of
#    a second before "PART 3", and then there is nothing at all.
# ---------------------------------------------------------------------------
echo "latch"
q -f lavfi -i "${NOISE}:d=0.06" -f lavfi -i "aevalsrc=0.9*sin(2*PI*96*t):s=${SR}:d=0.2" \
  -filter_complex "[0]highpass=1200,lowpass=7000,afade=t=out:st=0.004:d=0.055:curve=exp,volume=0.5[a];[1]afade=t=in:st=0:d=0.004,afade=t=out:st=0.02:d=0.18:curve=exp,volume=0.5[b];[a][b]amix=inputs=2:dropout_transition=0,alimiter=limit=0.96:level=0[out]" \
  -map "[out]" -ar "$SR" -ac 1 "$TMP/latch.raw.wav"
fit "$TMP/latch.raw.wav" -10 peak
place "$TMP/latch.raw.wav" "$TMP/latch.stem.wav" 27850 1

# ---------------------------------------------------------------------------
# 8. Master
#
# 14 stems go into amix, which divides by its input count on this build, so the
# make-up gain is MEASURED rather than assumed: mix once at unity, read the
# static window (which must land on -0.5 dBFS), then scale by exactly the error.
# ---------------------------------------------------------------------------
STEMS=(
  "$TMP/bed.stem.wav" "$TMP/hiss.stem.wav"
  "$TMP/vo-01.stem.wav" "$TMP/vo-02.stem.wav" "$TMP/vo-03.stem.wav"
  "$TMP/vo-04.stem.wav" "$TMP/vo-05.stem.wav" "$TMP/vo-06.stem.wav"
  "$TMP/static.stem.wav" "$TMP/switch.stem.wav"
  "$TMP/knock1.stem.wav" "$TMP/knock2.stem.wav" "$TMP/knock3.stem.wav"
  "$TMP/latch.stem.wav"
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
probe=$(window_peak_db "$TMP/probe.wav" 21.0 1.1)
scalar=$(awk -v p="$probe" 'BEGIN{printf "%.4f", 10 ^ ((-0.5 - p) / 20)}')
printf '  unity mix puts the static at %s dB, make-up gain x%s\n' "$probe" "$scalar"

mix_with "$scalar" mix.wav
static_peak=$(window_peak_db mix.wav 21.0 1.1)
awk -v p="$static_peak" 'BEGIN{ d = p - (-0.5); if (d > 0.6 || d < -0.6) { printf "  static landed at %s dB, expected -0.5: mix is unbalanced\n", p; exit 1 } }' \
  || { echo "FATAL: master calibration failed"; exit 1; }

echo
echo "  window levels in mix.wav"
report() { printf '    %-24s mean %7s dB   peak %6s dB\n' "$1" \
  "$("$FF" -hide_banner -nostats -ss "$2" -t "$3" -i mix.wav -af volumedetect -f null - 2>&1 | awk '/mean_volume/{print $5; exit}')" \
  "$(window_peak_db mix.wav "$2" "$3")"; }
report "0.0-3.4 pickup"        0     3.4
report "3.4-21.0 the call"     3.4   17.6
report "21.0-22.1 static"      21    1.1
report "22.1-26.0 dead line"   22.1  3.9
report "26.0-27.5 knocks"      26    1.5
report "27.85-28.1 latch"      27.85 0.25
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

# The film's last 1.8 s are digital silence on purpose. A rebuild that pads or
# normalises them away has broken the ending, so fail loudly.
case "$DURATION" in
  30.000|30.00*) ;;
  *) echo "  expected exactly 30.000 s, got ${DURATION}" >&2; exit 1 ;;
esac
