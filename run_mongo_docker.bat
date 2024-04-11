@echo off

docker run ^
    --name helium_mongo ^
    -p 27017:27017 ^
    -e MONGO_INITDB_ROOT_USERNAME="admin" ^
    -e MONGO_INITDB_ROOT_PASSWORD="admin" ^
    -d mongo