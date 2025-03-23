@echo off
echo ===== Deleting existing service =====
curl -i -X DELETE http://localhost:8001/services/auth-service

echo.
echo ===== Creating new service =====
curl -i -X POST http://localhost:8001/services ^
--data "name=auth-service" ^
--data "url=http://node_server:5000"

echo.
echo ===== Creating routes =====
curl -i -X POST http://localhost:8001/services/auth-service/routes ^
--data "name=auth-route" ^
--data "paths[]=/auth" ^
--data "paths[]=/auth/login" ^
--data "paths[]=/auth/register" ^
--data "paths[]=/auth/callback" ^
--data "paths[]=/auth/google" ^
--data "paths[]=/auth/google/callback" ^
--data "strip_path=false" ^
--data "preserve_host=true"

echo.
echo ===== Testing DNS Resolution =====
docker exec kong nslookup node_server

echo.
echo ===== Testing Direct Connection =====
docker exec kong curl -v http://node_server:5000/auth/login

echo.
echo ===== Testing Through Kong =====
curl -v http://localhost:8000/auth/login

pause 