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

echo "RabbitMQ username:"
read NEXT_PUBLIC_RABBITMQ_USERNAME

echo "RabbitMQ password:"
read NEXT_PUBLIC_RABBITMQ_PASSWORD

echo "RabbitMQ VHost:"
read NEXT_PUBLIC_RABBITMQ_VHOST

echo "RabbitMQ Host:"
read NEXT_PUBLIC_RABBITMQ_HOST

printf "MONGODB_URI=%s\n" $MONGODB_URI >> .env.local
printf "MONGODB_DB=%s" $MONGODB_DB >> .env.local
printf "NEXT_PUBLIC_RABBITMQ_USERNAME=%s" $NEXT_PUBLIC_RABBITMQ_USERNAME >> .env.local
printf "NEXT_PUBLIC_RABBITMQ_PASSWORD=%s" $NEXT_PUBLIC_RABBITMQ_PASSWORD >> .env.local
printf "NEXT_PUBLIC_RABBITMQ_VHOST=%s" $NEXT_PUBLIC_RABBITMQ_VHOST >> .env.local
printf "NEXT_PUBLIC_RABBITMQ_HOST=%s" $NEXT_PUBLIC_RABBITMQ_HOST >> .env.local

# build project
npm run build
