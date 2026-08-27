 = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/auth/login' -Method Post -Body @{username='admin@electronicsshop.com'; password='password'} -ContentType 'application/x-www-form-urlencoded'
 = .access_token
 = @{Authorization=('Bearer {0}' -f )}
try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/admin/orders/3203316b-a1fe-4a4a-899e-aae3ca566564/send-email' -Method Post -Headers  -Body '{\"email_type\":\"confirmation\"}' -ContentType 'application/json'
} catch {
    .Exception.Response.GetResponseStream() | %{ (New-Object System.IO.StreamReader()).ReadToEnd() }
}
