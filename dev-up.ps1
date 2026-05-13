# dev-up.ps1 — construye y arranca el stack en Windows evitando el bug de Compose-bake.
#
# Uso:
#   .\dev-up.ps1            # build + up -d
#   .\dev-up.ps1 -NoBuild   # sólo levanta lo que ya está construido
#   .\dev-up.ps1 -Logs      # build + up -d + tail de logs (Ctrl+C los detiene)
#
# Por qué existe: `docker compose up --build` en Windows a veces falla con
#   "failed to execute bake: read |0: file already closed"
# debido a un bug del bake interno con Buildx. Forzamos COMPOSE_BAKE=false.

[CmdletBinding()]
param(
    [switch]$NoBuild,
    [switch]$Logs
)

$ErrorActionPreference = "Stop"

# Forzar modo no-bake para esta sesión.
$env:COMPOSE_BAKE = "false"

Push-Location $PSScriptRoot
try {
    if (-not $NoBuild) {
        Write-Host ">> docker compose build api web" -ForegroundColor Cyan
        docker compose build api web
        if ($LASTEXITCODE -ne 0) { throw "build falló (exit=$LASTEXITCODE)" }
    }

    Write-Host ">> docker compose up -d" -ForegroundColor Cyan
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "up falló (exit=$LASTEXITCODE)" }

    Write-Host ">> servicios:" -ForegroundColor Cyan
    docker compose ps

    if ($Logs) {
        Write-Host ">> Siguiendo logs (Ctrl+C para salir)..." -ForegroundColor Cyan
        docker compose logs -f --tail=50
    }
}
finally {
    Pop-Location
}
