$uids_to_delete = @(
  "2GBpVJjOEbgG1bbO5WWLivrRNSJ2",
  "8MkrJhCyqFTUuax7Pb92R2gIO0H2",
  "LyxL63lWVdSCmeuztufApHdnCc82",
  "Tbzy2bTamrcPjNg6iuLjJbUVuyZ2",
  "u8Bjqg6mgoObI5BJm1y3vbkNtZp2",
  "wb1iVgz87kboBoY287KJ6oRUfhP2",
  "zCrwPptbZCQvNHOrZ6I41ikWow93"
)

foreach ($uid in $uids_to_delete) {
  Write-Host "Deleting user $uid from auth..."
  firebase auth:delete $uid -f --project glitch-36
  Write-Host "Deleting user $uid from staff..."
  firebase firestore:delete "staff/$uid" -f --project glitch-36
}

$collections = @(
  "participants", 
  "digitalPasses", 
  "scanLogs", 
  "attendance", 
  "certificates", 
  "teams", 
  "auditLogs", 
  "submissions", 
  "results", 
  "evaluations", 
  "announcements", 
  "classrooms"
)

foreach ($col in $collections) {
  Write-Host "Deleting collection $col..."
  firebase firestore:delete $col -r -f --project glitch-36
}

Write-Host "Done wiping DB."
