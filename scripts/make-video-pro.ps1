Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'videos\assets'
$framesDir = Join-Path $root 'videos\frames-pro'
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Get-ChildItem $framesDir -Filter '*.png' | Remove-Item -Force

$w = 1280; $h = 720; $fps = 10; $slideSeconds = 7.5
$birds = @()
for ($i = 0; $i -lt 8; $i++) { $birds += [System.Drawing.Image]::FromFile((Join-Path $assets "bird$i.jpg")) }
$shots = @{}
foreach ($name in @('dashboard','shifts','compliance','users','organization','invitations')) {
    $shots[$name] = [System.Drawing.Image]::FromFile((Join-Path $assets "desktop-$name.jpg"))
}
foreach ($name in @('dashboard','shifts','compliance','users')) {
    $shots["m-$name"] = [System.Drawing.Image]::FromFile((Join-Path $assets "mobile-$name.jpg"))
}
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'public\assets\logo-escuro-compacto.png'))

function Crop-Bird([System.Drawing.Image]$img) {
    $bmp = New-Object System.Drawing.Bitmap($img)
    $bg = [System.Drawing.Color]::FromArgb(14, 91, 52)
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y += 4) {
        for ($x = 0; $x -lt $bmp.Width; $x += 4) {
            $p = $bmp.GetPixel($x, $y)
            if ([math]::Abs($p.R - $bg.R) + [math]::Abs($p.G - $bg.G) + [math]::Abs($p.B - $bg.B) -gt 45) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $pad = 18
    $x0 = [math]::Max(0, $minX - $pad); $y0 = [math]::Max(0, $minY - $pad)
    $cw = [math]::Min($bmp.Width, $maxX + $pad + 1) - $x0
    $ch = [math]::Min($bmp.Height, $maxY + $pad + 1) - $y0
    $crop = $bmp.Clone((New-Object System.Drawing.Rectangle($x0, $y0, $cw, $ch)), $bmp.PixelFormat)
    $bmp.Dispose()
    return $crop
}

$birdCrops = @()
foreach ($bird in $birds) { $birdCrops += Crop-Bird $bird }

$fontTitle = New-Object System.Drawing.Font('Segoe UI', 50, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSub = New-Object System.Drawing.Font('Segoe UI', 23, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontBullet = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSmall = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontTag = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$yellow = [System.Drawing.ColorTranslator]::FromHtml('#F5B942')
$mint = [System.Drawing.ColorTranslator]::FromHtml('#D8F3E0')

$slides = @(
    @{ K='intro'; T='CUCO'; S='Controle de escalas com conformidade'; B=@('Do turno à auditoria','Em uma só plataforma'); C1='#0A4A2B'; C2='#061F13' },
    @{ K='desktop'; T='Visão operacional'; S='Telas desktop: gestão completa'; B=@('Escalas, equipe e usuários','Filtros, tabelas e ações rápidas'); C1='#0E5B34'; C2='#062815' },
    @{ K='mobile'; T='Mobilidade'; S='A operação acompanha o gestor'; B=@('Layout responsivo','Menu, formulários e indicadores no celular'); C1='#0A4A2B'; C2='#051C10' },
    @{ K='arquitetura'; T='Arquitetura técnica'; S='Simples de rodar, fácil de manter'; B=@('Node 22 + node:sqlite','Zero dependências de runtime','API REST + front vanilla + PWA'); C1='#126B3C'; C2='#062A18' },
    @{ K='compliance'; T='Conformidade trabalhista'; S='Regras configuráveis por convenção'; B=@('EC 141/2026: 44h → 42h → 40h','Dossiê PDF com hash SHA-256','Auditoria com IP, usuário e data'); C1='#0B5230'; C2='#051E11' },
    @{ K='acesso'; T='Acesso controlado'; S='Convites com aprovação de vínculo'; B=@('Administrador e funcionário','RBAC no servidor','CSRF, scrypt e cookies protegidos'); C1='#0E5B34'; C2='#061F13' },
    @{ K='seguranca'; T='Segurança e privacidade'; S='Dados localmente sob seu controle'; B=@('LGPD: base legal e direitos do titular','Backup automático e CI','SQLite local, sem nuvem obrigatória'); C1='#0A4A2B'; C2='#04170C' },
    @{ K='cta'; T='Comece do zero'; S='Crie o administrador e cadastre sua operação'; B=@('Instalação limpa','Acesso: marcos'); C1='#126B3C'; C2='#062A18' }
)

$total = $fps * $slideSeconds * $slides.Count

function Draw-SlideImage([System.Drawing.Graphics]$g, [System.Drawing.Image]$img, [int]$x, [int]$y, [int]$w2, [int]$h2, [int]$alpha) {
    $alpha = [math]::Max(0, [math]::Min(255, $alpha))
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb([math]::Min(90, $alpha), 0, 0, 0))
    $g.FillRectangle($shadow, $x + 8, $y + 8, $w2, $h2)
    $paper = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
    $g.FillRectangle($paper, $x, $y, $w2, $h2)
    $ix = [int]($x + 4); $iy = [int]($y + 4); $iw = [int]($w2 - 8); $ih = [int]($h2 - 8)
    $rect = New-Object System.Drawing.Rectangle -ArgumentList $ix, $iy, $iw, $ih
    $g.DrawImage($img, $rect)
}

for ($i = 0; $i -lt $total; $i++) {
    $idx = [math]::Floor($i / ($fps * $slideSeconds))
    if ($idx -ge $slides.Count) { $idx = $slides.Count - 1 }
    $slide = $slides[$idx]
    $local = ($i % ($fps * $slideSeconds)) / ($fps * $slideSeconds)

    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $c1 = [System.Drawing.ColorTranslator]::FromHtml($slide.C1)
    $c2 = [System.Drawing.ColorTranslator]::FromHtml($slide.C2)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Rectangle(0,0,$w,$h)), $c1, $c2, 35)
    $g.FillRectangle($grad, 0, 0, $w, $h)

    $ring = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28,255,255,255), 3)
    $off = [int](($i % 100) * 0.8)
    $g.DrawEllipse($ring, 950 - $off, -200 + $off, 640, 640)

    $g.DrawImage($logo, 72, 52, 230, 58)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($yellow)), 72, 128, 70, 5)

    $aTitle = [math]::Min(255, [int]($local * 255 * 5))
    $tb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($aTitle,255,255,255))
    $g.DrawString($slide.T, $fontTitle, $tb, 72, 168)

    $aSub = [math]::Min(255, [int](($local - 0.06) * 255 * 5))
    if ($aSub -gt 0) {
        $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($aSub, 215, 240, 225))
        $g.DrawString($slide.S, $fontSub, $sb, 76, 248)
    }

    # conteúdo por slide
    if ($slide.K -eq 'intro' -or $slide.K -eq 'cta' -or $slide.K -eq 'seguranca') {
        $frame = $birdCrops[$i % 8]
        $bob = [int]([math]::Sin($i * 0.35) * 8)
        $g.DrawImage($frame, 880, 190 + $bob, 300, 360)
        $y = 330
        for ($b = 0; $b -lt $slide.B.Count; $b++) {
            $al = [math]::Min(255, [int](($local - 0.18 - $b * 0.12) * 255 * 6))
            if ($al -gt 0) {
                $bb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al,255,255,255))
                $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al,245,185,66))), 80, $y + 10, 10, 10)
                $g.DrawString($slide.B[$b], $fontBullet, $bb, 108, $y)
            }
            $y += 58
        }
    }
    elseif ($slide.K -eq 'desktop') {
        $al = [math]::Min(255, [int](($local - 0.12) * 255 * 5))
        Draw-SlideImage $g ($shots['dashboard']) 72 310 550 300 $al
        Draw-SlideImage $g ($shots['shifts']) 658 310 550 300 $al
        $frame = $birdCrops[$i % 8]
        $g.DrawImage($frame, 1030, 30 + [int]([math]::Sin($i*0.4)*5), 180, 215)
    }
    elseif ($slide.K -eq 'mobile') {
        $al = [math]::Min(255, [int](($local - 0.12) * 255 * 5))
        Draw-SlideImage $g ($shots['m-dashboard']) 150 300 240 340 $al
        Draw-SlideImage $g ($shots['m-shifts']) 430 300 240 340 $al
        Draw-SlideImage $g ($shots['m-compliance']) 710 300 240 340 $al
        Draw-SlideImage $g ($shots['m-users']) 990 300 240 340 $al
    }
    elseif ($slide.K -eq 'arquitetura') {
        $labels = @('NODE 22','API REST','SQLITE LOCAL','FRONT PWA')
        $x = 72
        for ($b = 0; $b -lt $labels.Count; $b++) {
            $al = [math]::Min(255, [int](($local - 0.1 - $b*0.1) * 255 * 5))
            if ($al -gt 0) {
                $box = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al, 255, 255, 255))
                $g.FillRectangle($box, $x, 330, 250, 130)
                $tx = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al, 14, 75, 43))
                $g.DrawString($labels[$b], $fontTag, $tx, $x + 20, 375)
                if ($b -lt 3) {
                    $g.DrawString('→', (New-Object System.Drawing.Font('Segoe UI',34,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)), (New-Object System.Drawing.SolidBrush($yellow)), $x + 258, 360)
                }
            }
            $x += 290
        }
        $y = 510
        for ($b = 0; $b -lt $slide.B.Count; $b++) {
            $al = [math]::Min(255, [int](($local - 0.35 - $b*0.08) * 255 * 6))
            if ($al -gt 0) {
                $bb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al,255,255,255))
                $g.DrawString('•  ' + $slide.B[$b], $fontBullet, $bb, 76, $y)
            }
            $y += 46
        }
    }
    else {
        $al = [math]::Min(255, [int](($local - 0.12) * 255 * 5))
        Draw-SlideImage $g ($shots['compliance']) 72 305 560 300 $al
        Draw-SlideImage $g ($shots['invitations']) 660 305 550 300 $al
        $y = 345
        for ($b = 0; $b -lt $slide.B.Count; $b++) {
            $ab = [math]::Min(255, [int](($local - 0.2 - $b*0.1) * 255 * 6))
            if ($ab -gt 0) {
                $bb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($ab,255,255,255))
                $g.DrawString('•  ' + $slide.B[$b], $fontBullet, $bb, 76, $y)
            }
            $y += 46
        }
    }

    $track = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55,255,255,255))
    $g.FillRectangle($track, 72, 682, $w - 144, 4)
    $prog = [int](($i / $total) * ($w - 144))
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($yellow)), 72, 682, $prog, 4)
    $g.DrawString('cuco · controle de escalas', $fontSmall, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150,255,255,255))), 72, 692)

    $bmp.Save((Join-Path $framesDir ('frame{0:d4}.png' -f $i)), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $grad.Dispose(); $ring.Dispose()
}

foreach ($img in $birds + $birdCrops + $shots.Values + @($logo)) { $img.Dispose() }
Write-Output ("frames gerados: " + $total)
