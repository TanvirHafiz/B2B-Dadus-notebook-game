#!/bin/sh
# Synthesises the sound effects with ffmpeg (no recordings, so no licence to track) and converts the CC0 music loop to OGG.
# Usage: sh tools/make-sfx.sh      Needs ffmpeg. Output goes to assets/audio/.
set -e
O=assets/audio; mkdir -p $O
F="-hide_banner -loglevel error -y"
Q="-c:a libvorbis -q:a 3"
# soft woody tap
ffmpeg $F -f lavfi -i "sine=frequency=330:duration=0.09" -af "afade=t=out:st=0:d=0.09,volume=0.8,lowpass=f=1800" $Q $O/tap.ogg
# gentle three-note chime (correct)
ffmpeg $F -f lavfi -i "sine=frequency=659:duration=0.55" -f lavfi -i "sine=frequency=880:duration=0.55" -f lavfi -i "sine=frequency=1318:duration=0.55" -filter_complex "[0]adelay=0|0[a];[1]adelay=90|90[b];[2]adelay=180|180[c];[a][b][c]amix=inputs=3:normalize=0,afade=t=out:st=0.2:d=0.5,volume=0.5" $Q $O/ok.ogg
# soft low thud (wrong)
ffmpeg $F -f lavfi -i "sine=frequency=110:duration=0.3" -af "afade=t=out:st=0:d=0.3,volume=0.9,lowpass=f=400" $Q $O/no.ogg
# small win jingle
ffmpeg $F -f lavfi -i "sine=frequency=523:duration=0.9" -f lavfi -i "sine=frequency=659:duration=0.9" -f lavfi -i "sine=frequency=784:duration=0.9" -f lavfi -i "sine=frequency=1047:duration=0.9" -filter_complex "[0]adelay=0|0[a];[1]adelay=140|140[b];[2]adelay=280|280[c];[3]adelay=420|420[d];[a][b][c][d]amix=inputs=4:normalize=0,afade=t=out:st=0.4:d=0.5,volume=0.45" $Q $O/win.ogg
# paper page turn: a short sweep of filtered noise
ffmpeg $F -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.5" -af "highpass=f=1500,lowpass=f=6000,afade=t=in:st=0:d=0.1,afade=t=out:st=0.2:d=0.3,volume=0.5" $Q $O/page.ogg
# liquid pour: low noise that swells then fades, with a burbling tremolo
ffmpeg $F -f lavfi -i "anoisesrc=d=1.6:c=brown:a=0.6" -af "lowpass=f=900,tremolo=f=11:d=0.5,afade=t=in:st=0:d=0.4,afade=t=out:st=0.9:d=0.7,volume=1.2" $Q $O/pour.ogg
# tin clink
ffmpeg $F -f lavfi -i "sine=frequency=2100:duration=0.5" -f lavfi -i "sine=frequency=3150:duration=0.5" -filter_complex "[0][1]amix=inputs=2:normalize=0,afade=t=out:st=0:d=0.5,volume=0.35" $Q $O/tin.ogg
# shutter rattle: metallic noise with a fast tremolo, rising then falling
ffmpeg $F -f lavfi -i "anoisesrc=d=1.4:c=white:a=0.4" -af "bandpass=f=1800:width_type=h:w=1600,tremolo=f=28:d=0.9,afade=t=in:st=0:d=0.2,afade=t=out:st=0.8:d=0.6,volume=0.9" $Q $O/shutter.ogg
# hand crank: slow ratchet clicks
ffmpeg $F -f lavfi -i "anoisesrc=d=0.8:c=white:a=0.5" -af "bandpass=f=900:width_type=h:w=800,tremolo=f=9:d=1.0,afade=t=out:st=0.5:d=0.3" $Q $O/crank.ogg
# beans rattling in a pan
ffmpeg $F -f lavfi -i "anoisesrc=d=1.2:c=white:a=0.5" -af "bandpass=f=3200:width_type=h:w=2500,tremolo=f=16:d=0.8,afade=t=in:st=0:d=0.15,afade=t=out:st=0.7:d=0.5,volume=0.7" $Q $O/rattle.ogg
# background music (Pixabay, supplied by the project owner), levelled and faded in
ffmpeg $F -i source-assets/audio/desifreemusic-soft-romantic-folk-melody-flute-331843.mp3 -af "loudnorm=I=-20:TP=-2,afade=t=in:st=0:d=2" -c:a libvorbis -ac 1 -ar 32000 -q:a 0 $O/music.ogg
# bring every effect up to a peak of -3 dB (the raw tones are very quiet)
for f in tap ok no win page pour tin shutter crank rattle; do
  m=$(ffmpeg -hide_banner -i $O/$f.ogg -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(.*\) dB/\1/p')
  g=$(awk "BEGIN{print -3-($m)}")
  ffmpeg $F -i $O/$f.ogg -af "volume=${g}dB" $Q $O/$f.tmp.ogg && mv $O/$f.tmp.ogg $O/$f.ogg
done
ls -l $O
