Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$framesDir = Join-Path $root 'videos\frames'
$outputDir = Join-Path $root 'videos'
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Get-ChildItem $framesDir -Filter '*.png' | Remove-Item -Force

$w = 1280
$h = 720
$fps = 10
$slideSeconds = 10
$slides = @(
    @{
        Title = 'CUCO'
        Subtitle = 'Controle de escalas com conformidade'
        Bullets = @('Uma operação mais organizada', 'Do primeiro turno à auditoria')
        C1 = '#0A4A2B'; C2 = '#061F13'
    },
    @{
        Title = 'O problema'
        Subtitle = 'Escala no WhatsApp, planilha e risco trabalhista'
        Bullets = @('Turnos divulgados em grupos', 'Horas e folgas sem conferência', 'Nenhuma prova quando surge um conflito')
        C1 = '#0E5B34'; C2 = '#062815'
    },
    @{
        Title = 'A solução'
        Subtitle = 'Tudo em um só lugar, com acesso por perfil'
        Bullets = @('Escalas, equipe e integrantes', 'Convites com aprovação de vínculo', 'Trocas de turno e notificações')
        C1 = '#0A4A2B'; C2 = '#072415'
    },
    @{
        Title = 'Diferenciais'
        Subtitle = 'A escala como prova defensável da jornada'
        Bullets = @('Validador CLT e EC 141/2026', 'Dossiê em PDF com hash SHA-256', 'Auditoria com IP, usuário e data')
        C1 = '#126B3C'; C2 = '#062A18'
    },
    @{
        Title = 'Segurança e arquitetura'
        Subtitle = 'Pronto para operar e para publicar'
        Bullets = @('Node 22 + SQLite local, zero dependências', 'Login, RBAC, CSRF e cookies protegidos', 'PWA, backup automático e CI')
        C1 = '#0B5230'; C2 = '#051E11'
    },
    @{
        Title = 'Comece do zero'
        Subtitle = 'Crie o administrador e cadastre sua operação'
        Bullets = @('Instalação limpa, sem dados de exemplo', 'Acesso: marcos', 'Cuco · escalas com conformidade')
        C1 = '#0E5B34'; C2 = '#061F13'
    }
)

$logoPath = Join-Path $root 'public\assets\logo-escuro-compacto.png'
$logo = [System.Drawing.Image]::FromFile($logoPath)
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 56, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSub = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontBullet = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSmall = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$white = [System.Drawing.Color]::White
$yellow = [System.Drawing.ColorTranslator]::FromHtml('#F5B942')

$total = $fps * $slideSeconds * $slides.Count

for ($i = 0; $i -lt $total; $i++) {
    $slideIndex = [math]::Floor($i / ($fps * $slideSeconds))
    if ($slideIndex -ge $slides.Count) { $slideIndex = $slides.Count - 1 }
    $slide = $slides[$slideIndex]
    $local = ($i % ($fps * $slideSeconds)) / ($fps * $slideSeconds)

    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $c1 = [System.Drawing.ColorTranslator]::FromHtml($slide.C1)
    $c2 = [System.Drawing.ColorTranslator]::FromHtml($slide.C2)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), $c1, $c2, 35)
    $g.FillRectangle($gradient, 0, 0, $w, $h)

    # anéis decorativos com leve rotação por frame
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 255, 255, 255), 3)
    $offset = [int](($i % 120) * 0.7)
    $g.DrawEllipse($ringPen, 980 - $offset, -180 + $offset, 620, 620)
    $g.DrawEllipse($ringPen, -220 + $offset, 470 - $offset, 480, 480)

    # logo com leve entrada
    $logoAlpha = [math]::Min(1, $local * 8)
    $g.DrawImage($logo, 80, 60, [int](260 * $logoAlpha), [int](65 * $logoAlpha))

    # barra amarela
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($yellow)), 80, 150, 70, 6)

    $alphaTitle = [math]::Min(255, [int]($local * 255 * 5))
    $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alphaTitle, 255, 255, 255))
    $g.DrawString($slide.Title, $fontTitle, $titleBrush, 80, 195)

    $alphaSub = [math]::Min(255, [int](($local - 0.08) * 255 * 5))
    if ($alphaSub -gt 0) {
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alphaSub, 220, 240, 228))
        $g.DrawString($slide.Subtitle, $fontSub, $subBrush, 84, 285)
    }

    $y = 370
    for ($b = 0; $b -lt $slide.Bullets.Count; $b++) {
        $start = 0.20 + $b * 0.13
        $alphaBullet = [math]::Min(255, [int](($local - $start) * 255 * 6))
        if ($alphaBullet -gt 0) {
            $bulletBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alphaBullet, 255, 255, 255))
            $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alphaBullet, 245, 185, 66))), 88, $y + 11, 10, 10)
            $g.DrawString($slide.Bullets[$b], $fontBullet, $bulletBrush, 116, $y)
        }
        $y += 62
    }

    # progresso geral
    $track = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
    $g.FillRectangle($track, 80, 678, $w - 160, 4)
    $progress = [int](($i / $total) * ($w - 160))
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($yellow)), 80, 678, $progress, 4)
    $g.DrawString('cuco · controle de escalas', $fontSmall,
        (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 255, 255, 255))), 80, 690)

    $path = Join-Path $framesDir ('frame{0:d4}.png' -f $i)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $gradient.Dispose(); $ringPen.Dispose()
}

$logo.Dispose()
Write-Output ("frames gerados: " + $total)
