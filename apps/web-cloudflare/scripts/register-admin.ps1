param(
  [string]$BaseUrl = "https://prompthub-cfworkers.bigqiang.workers.dev",
  [string]$Username = "qiang"
)

$ErrorActionPreference = "Stop"

function Resolve-CaptchaAnswer {
  param([string]$Prompt)

  if ($Prompt -notmatch '^\s*(\d+)\s*([+-])\s*(\d+)\s*=\s*\?\s*$') {
    throw "Unsupported captcha prompt: $Prompt"
  }

  $left = [int]$Matches[1]
  $op = $Matches[2]
  $right = [int]$Matches[3]
  if ($op -eq "+") {
    return [string]($left + $right)
  }
  return [string]($left - $right)
}

function ConvertFrom-SecureStringToPlainText {
  param([securestring]$SecureString)

  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

$normalizedBaseUrl = $BaseUrl.TrimEnd("/")
$passwordSecure = Read-Host "Password for $Username" -AsSecureString
$password = ConvertFrom-SecureStringToPlainText $passwordSecure

if ($password.Length -lt 8) {
  throw "Password must be at least 8 characters."
}

$captcha = Invoke-RestMethod -Method Get -Uri "$normalizedBaseUrl/api/auth/captcha"
$answer = Resolve-CaptchaAnswer -Prompt $captcha.data.prompt

$body = @{
  username = $Username
  password = $password
  captchaId = $captcha.data.captchaId
  captchaAnswer = $answer
} | ConvertTo-Json

$result = Invoke-RestMethod `
  -Method Post `
  -Uri "$normalizedBaseUrl/api/auth/register" `
  -ContentType "application/json" `
  -Body $body

Write-Host "Created PromptHub Cloudflare admin user '$($result.data.user.username)'." -ForegroundColor Green
