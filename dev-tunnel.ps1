# Activa tunel HTTPS hacia la API (puerto 8000) para Twilio.
#
# Docker (recomendado):
#   .\dev-tunnel.ps1 -Docker
#   Arranca el tunel en segundo plano, imprime la URL trycloudflare y sale.
#   Ver trafico en vivo:  docker compose logs -f tunnel
#   Parar:                docker compose --profile tunnel stop tunnel
#
# Docker (adjuntar consola al contenedor, como antes):
#   .\dev-tunnel.ps1 -Docker -Attach
#
# Host (cloudflared o ngrok en PATH hacia 127.0.0.1:8000):
#   .\dev-tunnel.ps1

[CmdletBinding()]
param(
    [switch]$Docker,
    [switch]$Attach
)

$ErrorActionPreference = "Stop"
$env:COMPOSE_BAKE = "false"

function Write-Step([string]$msg) {
    Write-Host $msg -ForegroundColor Cyan
}

if ($Docker) {
    Write-Step "Perfil tunnel: cloudflared -> servicio api:8000 (Compose)."
    Write-Host ""
    Write-Host "  1) En otra ventana (si aun no):  docker compose up -d api redis web" -ForegroundColor Yellow
    Write-Host "  2) Pega la URL que sale abajo en Configuracion -> WEBHOOK_BASE_URL" -ForegroundColor Yellow
    Write-Host "  3) Copia la URL del webhook del panel y pegala en Twilio." -ForegroundColor Yellow
    Write-Host ""

    Push-Location $PSScriptRoot
    try {
        if ($Attach) {
            docker compose --profile tunnel up tunnel
            exit $LASTEXITCODE
        }

        docker compose --profile tunnel up -d tunnel
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose up -d tunnel fallo (exit=$LASTEXITCODE)"
        }

        $url = $null
        foreach ($i in 1..8) {
            Start-Sleep -Seconds 2
            $logText = docker compose logs tunnel 2>&1 | Out-String
            if ($logText -match "https://[a-z0-9-]+\.trycloudflare\.com") {
                $url = $Matches[0]
                break
            }
        }

        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        if ($url) {
            Write-Host "  WEBHOOK_BASE_URL (sin barra / al final):" -ForegroundColor Green
            Write-Host "  $url" -ForegroundColor White
        }
        else {
            Write-Host "  No pude leer la URL aun. Ejecuta:" -ForegroundColor Yellow
            Write-Host "  docker compose logs tunnel --tail 80" -ForegroundColor White
        }
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Ver tunel en vivo:  docker compose logs -f tunnel" -ForegroundColor DarkGray
        Write-Host "  Parar tunel:        docker compose --profile tunnel stop tunnel" -ForegroundColor DarkGray
        Write-Host ""
    }
    finally {
        Pop-Location
    }
    exit 0
}

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cf) {
    Write-Step "cloudflared -> http://127.0.0.1:8000"
    & cloudflared tunnel --url http://127.0.0.1:8000
    exit $LASTEXITCODE
}

$ng = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ng) {
    Write-Step "ngrok -> http://127.0.0.1:8000"
    & ngrok http 8000
    exit $LASTEXITCODE
}

Write-Host "No hay cloudflared ni ngrok en el PATH." -ForegroundColor Red
Write-Host ""
Write-Host "  Opcion A:  .\dev-tunnel.ps1 -Docker" -ForegroundColor Green
Write-Host "  Opcion B:  winget install --id Cloudflare.cloudflared" -ForegroundColor Green
Write-Host "             cloudflared tunnel --url http://127.0.0.1:8000" -ForegroundColor Green
exit 1
