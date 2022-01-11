# install nodejs
sudo apt install nodejs

# install nodejs packages
cd frontend/
npm install

touch .env.local
echo "MongoDB URI:"
read MONGODB_URI

echo "MongoDB database:"
read MONGODB_DB

printf "MONGODB_URI=%s\n" $MONGODB_URI >> .env.local
printf "MONGODB_DB=%s" $MONGODB_DB >> .env.local

# build project
npm run build
