
Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\INDIA\.gemini\antigravity-ide\brain\aec9e307-6cc1-4dc7-ab7d-ccd038544872\.user_uploaded\media_1787061181263.png'
$pub = 'c:\Users\INDIA\Desktop\Project Ruhvi\public'

Copy-Item -Path $src -Destination (Join-Path $pub 'logo.png') -Force

function Resize-Image($srcPath, $destPath, $width, $height) {
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $width, $height)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
}

Resize-Image $src (Join-Path $pub 'favicon-16x16.png') 16 16
Resize-Image $src (Join-Path $pub 'favicon-32x32.png') 32 32
Resize-Image $src (Join-Path $pub 'apple-touch-icon.png') 180 180
Resize-Image $src (Join-Path $pub 'android-chrome-192x192.png') 192 192
Resize-Image $src (Join-Path $pub 'android-chrome-512x512.png') 512 512

$bmp32 = New-Object System.Drawing.Bitmap(32, 32)
$imgSrc = [System.Drawing.Image]::FromFile($src)
$g = [System.Drawing.Graphics]::FromImage($bmp32)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($imgSrc, 0, 0, 32, 32)
$hIcon = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream((Join-Path $pub 'favicon.ico'), [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$g.Dispose()
$bmp32.Dispose()
$imgSrc.Dispose()

Write-Output 'FAVICONS_GENERATED_OK'
