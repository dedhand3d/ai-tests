# Prepares a video for the dinette TV. Usage (from the project folder):
#   & .\scripts\encode-tv.ps1 -Source "tv\zwinkys commercial.mp4" -Name zwinkys
# Writes, all loudness-matched so every clip sits at the same level:
#   public\tv\<Name>.mp4   H.264 picture, 640x480 for the little CRT (the set tries this first)
#   public\tv\<Name>.webm  VP9 picture, the fallback where MP4 will not play
#   public\tv\<Name>.wav   the sound, mono 22 kHz PCM. The TV plays this through the game's audio engine, not the
#                          video's own track: some browsers (VS Code's built-in one) play an MP4's picture but
#                          cannot decode its AAC sound, and cannot open WebM at all. Plain WAV decodes everywhere.
# Prints the length to put in src/channels.ts.
# Needs ffmpeg and ffprobe on the PATH (winget install Gyan.FFmpeg).
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Name
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $root 'public\tv'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$clip = Resolve-Path $Source
$video = 'scale=640:480:flags=lanczos,setsar=1'
$audio = 'loudnorm=I=-11:TP=-1.5:LRA=11'
ffmpeg -hide_banner -loglevel error -y -i $clip -vf $video -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 96k -ar 48000 -af $audio (Join-Path $destination "$Name.webm")
ffmpeg -hide_banner -loglevel error -y -i $clip -vf $video -c:v libx264 -preset slow -crf 24 -maxrate 1600k -bufsize 3200k -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -af $audio -movflags +faststart (Join-Path $destination "$Name.mp4")
ffmpeg -hide_banner -loglevel error -y -i $clip -vn -af $audio -ac 1 -ar 22050 -c:a pcm_s16le (Join-Path $destination "$Name.wav")
$seconds = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 (Join-Path $destination "$Name.mp4"))
foreach ($extension in @('mp4', 'webm', 'wav')) {
    $file = Get-Item (Join-Path $destination "$Name.$extension")
    Write-Output ("{0,-24} {1,8:N1} KB" -f $file.Name, ($file.Length / 1KB))
}
Write-Output ("Length: {0:N2} s  ->  in src/channels.ts: src: 'tv/{1}', seconds: {0:N2}" -f $seconds, $Name)
