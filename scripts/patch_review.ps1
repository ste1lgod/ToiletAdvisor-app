$body = @{
    fields = @{
        userPhone = @{ stringValue = "Admin(Amal)" }
    }
} | ConvertTo-Json -Depth 5

$url = "https://firestore.googleapis.com/v1/projects/toiletadvisorrr/databases/(default)/documents/reviews/w6PxJVvjn4HHYuTFqP1t?updateMask.fieldPaths=userPhone&key=AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4"

$result = Invoke-RestMethod -Method PATCH -Uri $url -ContentType "application/json" -Body $body
Write-Host "userPhone now:" $result.fields.userPhone.stringValue
