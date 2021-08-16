# Frontend install script for Ubuntu
sudo apt-get update

# install python
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install python3.8

# python module pip installs
pip install celery
pip install aiohttp

# install nodejs
sudo apt install nodejs

# install nodejs packages
cd frontend/
npm install

