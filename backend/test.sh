RES=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"phoneNumber": "+263777'${RANDOM}'", "role": "passenger"}' http://localhost:5001/api/v1/users/register)
ID=$(echo $RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
curl -s -X POST -H 'Content-Type: application/json' -d '{"userId":"'$ID'", "fullName": "Test User"}' http://localhost:5001/api/v1/profiles
curl -s -X POST -F "idCardFront=@test-images/id_small.jpg" -F "selfie=@test-images/selfie_small.jpg" http://localhost:5001/api/v1/profiles/$ID/verify
