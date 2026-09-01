param(
  [ValidateSet('status', 'deploy')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'

if (Test-Path -LiteralPath $envPath) {
  foreach ($line in Get-Content -LiteralPath $envPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
    $name, $value = $trimmed.Split('=', 2)
    if (-not [Environment]::GetEnvironmentVariable($name.Trim())) {
      [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), 'Process')
    }
  }
}

$apiKey = [Environment]::GetEnvironmentVariable('RENDER_API_KEY')
$serviceId = [Environment]::GetEnvironmentVariable('RENDER_SERVICE_ID')
if ([string]::IsNullOrWhiteSpace($apiKey)) { throw 'RENDER_API_KEY is not configured in .env or the process environment.' }
if ([string]::IsNullOrWhiteSpace($serviceId)) { throw 'RENDER_SERVICE_ID is not configured in .env or the process environment.' }

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept = 'application/json'
}
$baseUrl = "https://api.render.com/v1/services/$serviceId"

try {
  if ($Action -eq 'status') {
    $service = Invoke-RestMethod -Method Get -Uri $baseUrl -Headers $headers
    [pscustomobject]@{
      Id = $service.service.id
      Name = $service.service.name
      Type = $service.service.type
      Suspended = $service.service.suspended
      UpdatedAt = $service.service.updatedAt
    }
  } else {
    $deploy = Invoke-RestMethod -Method Post -Uri "$baseUrl/deploys" -Headers $headers -ContentType 'application/json' -Body '{}'
    [pscustomobject]@{ Id = $deploy.id; Status = $deploy.status; CreatedAt = $deploy.createdAt }
  }
} catch {
  # Deliberately avoid serializing request headers or credential-bearing objects.
  throw "Render API request failed (HTTP integration error). Check the service ID, API key permissions, and network connection."
}
