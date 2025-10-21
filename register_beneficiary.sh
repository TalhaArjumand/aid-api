#!/bin/bash

curl -X POST http://localhost:3000/v1/auth/self-registration \
  -H "Content-Type: multipart/form-data" \
  -F "email=beneficiary1@example.com" \
  -F "password=StrongPass123!" \
  -F "phone=+927001234567" \
  -F "country=Pakistan" \
  -F "state=Punjab" \
  -F "device_imei=imei-device-123456789" \
  -F "type=profile" \
  -F "profile_pic=@/Users/njap/Downloads/profile.jpg"

echo -e "\n✅ Beneficiary registration request sent!"

#chmod +x register_beneficiary.sh
#./register_beneficiary.sh