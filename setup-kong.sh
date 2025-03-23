#!/bin/bash

echo "Creating auth service..."
curl -i -X POST http://localhost:8001/services \
  --data name=auth-service \
  --data url='http://auth_server:5000'

echo -e "\nCreating auth routes..."
curl -i -X POST http://localhost:8001/services/auth-service/routes \
  --data 'paths[]=/auth' \
  --data 'paths[]=/auth/login' \
  --data 'paths[]=/auth/register' \
  --data 'paths[]=/auth/callback' \
  --data 'paths[]=/auth/google' \
  --data 'paths[]=/auth/google/callback' \
  --data 'strip_path=false' \
  --data 'preserve_host=true' \
  --data 'name=auth-route'

echo -e "\nVerifying configuration..."
echo "Services:"
curl -s http://localhost:8001/services | grep name
echo -e "\nRoutes:"
curl -s http://localhost:8001/routes | grep name 