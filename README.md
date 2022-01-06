# README

This project is a UI for filtering down a large number of documents for eventual qualitative analysis. It is being purpose-built for looking through the 600k+ posts on Reddit's AITA forum to extract information on the norms and expectations regarding digital privacy behaviours. This README has two purposes: (1) like a normal readme, explain how to run the code; and (2) to document the building process for eventual analysis on the building process itself.


## Backend Installation

First, we highly recommend setting up a virtual environment to manage your python packages. This tutorial assumes that you have Anaconda installed (https://www.anaconda.com/products/individual)[https://www.anaconda.com/products/individual]. Set up a new virtual environment and activate it:

```
conda create --name teleoscope
conda activate teleoscope
```

Then clone this repository and navigate to the backend folder.

```
git clone https://github.com/Teleoscope/Teleoscope.git
cd Teleoscope/backend
```

Install the backend requirements. If you're not using conda, you can replace "conda install" with "pip3 install".

```
conda install tqdm
conda install pymongo
conda install numpy
conda install celery
conda install aiohttp

pip3 install gensim
pip3 install tensorflow_hub
pip3 install aiohttp_middlewares
```



# Version 0.3.0
This version is now deployable on Azure servers. As such, it comes with a new install script. Only tested on Ubuntu 20.04 so far. Requires sudo privileges.

## Frontend Installation
```
git clone https://github.com/UntitledCorpusExplorer/CorpusExplorer.git
cd CorpusExplorer
chmod u+x install.sh
sudo ./install.sh
```

You should be prompted for your MongoDB URI and Database name. Right now, the URI includes password-protected information and should be requested directly from an admin. The DB is `aita`. Similarly, the system requires an SSH tunnel to work, so you'll have to also request that access from an admin. After that, you can add this to your .ssh config:

```
Host bastion-host
    User <your username for the bastion host>
    HostName remote.cs.ubc.ca
    IdentityFile ~/.ssh/id_rsa
    Port 22

Host bastion-host-mongo-forward
    User <your other username>
    Port 22
    IdentityFile ~/.ssh/id_rsa
    HostName <the hostname of the machine behind the host>
    ProxyJump <your username for the bastion host>@bastion-host

    # MongoBD forward
    Localforward 3307 <the hostname of the machine behind the host>:27017
    # RabbitMQ remote python/celery connection
    Localforward 3308 <the hostname of the machine behind the host>:5672
```

Last, run `npm run build` to test the install and `ssh bastion-host-mongo-forward` to test the ssh tunnel.


## Running
If you are already connected to the bastion host, leave it running and open another tab and cd to the frontend: `cd /path/to/CorpusExplorer/frontend`. Then run `npm run dev` for live dev builds with hotswapped code, or `npm run start` for production builds.


## Backend Installation

If you're developing for the backend, it's highly recommended that you use some kind of package manager or virtual environment such as [Anaconda](https://docs.anaconda.com/anaconda/install/). If you are going to use Anaconda, you can create a virtual environment with the following:

```
conda update conda # just good practice
conda create -n yourenvname python=x.x anaconda
conda activate yourenvname
```

This just makes it easier to switch between package dependencies if you ever need to for different projects. Next, install the following python packages. Recommended to use `python -m pip install package` where `python` can be replaced with whatever python version you need (e.g., `python3` or `python3.8`). You may need these if there are multiple versions of python installed on your machine.

```
python -m pip install celery
python -m pip install pymongo
python -m pip install scipy
python -m pip install sklearn
python -m pip install gensim
```

You may want to test each of these installations by opening an interactive python shell (e.g., run `python`) and then importing the modules:

```
import celery
import pymongo
import scipy
import sklearn
import gensim
```

If that works, you can run `quit()` in your interpreter (a.k.a. "shell") and install the helper packages:

```
python -m pip install tqdm
python -m pip install requests
python -m pip install bottleneck
python -m pip install joblib
```

Before testing the backend, you'll need to create an authorization module. This is just a python file that has your private information in it. Right now, the format is as follows:

```
mongodb = {
	"username": "<mongodb_username>",
	"password": "<mongodb_password>",
	"host": "localhost:<local forwarding port, e.g., 3307>",
	"string": "mongodb://<mongodb_username>:<mongodb_password>@localhost:<local forwarding port>/aita"
}

rabbitmq = {
	"username": "<rabbitmq_username>",
	"password": "<rabbitmq_password>",
	"host": "localhost",
	"vhost": "<vhost name>"
}
```

You will need to contact an adminstrator to received the credentials above. Once you have the credentials, create the file by running `touch auth.py` and using your favourite text editor to enter the information from above.

Now you can test the installation. Run an interpreter again and then `import tasks`. If that runs, `import server`. Now you should be ready to roll!


# Deprecated

## Version 0.2.0

Major overhaul for this version:

- Switched to a Next.JS (React) front-end development framework
- Backend NLP proccessing handled by Gensim
- Added distributed workers for handling ongoing NLP tasks

### Why the current packages

#### NextJS

NextJS is a development framework for React. React handles UI state changes by managing a virtual DOM. This reduces the amount of explicit state management and interrelated callbacks that you might otherwise have to program explicitly in. React also leverages a lot of syntactic sugar to help manage rendering DOM elements which speeds up development. Finally, React is also widely-supported and there are many libraries available that make development faster. NextJS specifically provides built-in support for data fetching, including handling asynch calls and local caching. It also provides built-in API routing.

The design of the front end is to essentially leverage this API functionality. Read-only calls to the MongoDB backend are managed through the API. NextJS's data fetching features manage the problem of making sure your data is always available and not stale, so MongoDB updates are propagated to the UI in what appears to be immediately.

#### RabbitMQ

The previous version of the TFIDF Explorer required the corpus data to be loaded into and transformed in memory. However, some NLP functions take a long time to complete, and managing asynchronous operations in Python can be very difficult. Celery/RabbitMQ provide a method for distributing asychronous tasks (Celery is the python package, RabbitMQ is the message broker). Downside is that you can't share memory/pass pointers between workers which means that serialization is a big cost---however, since a lot of this processing is going on in the background while the user can do other things, it's not very visible. Upside is that not having to deal with Python's explicit management of yielding async calls means you can design a completely distributed processing framework with low overhead and do, e.g., partial computes.

#### Gensim

Genism is essentially an topic modelling/NLP prototyping package with a lot of one-liner built-in support for a lot of common NLP tasks from tokenizing to model-building. It works well with SciKit, and provides a variety of Soft Similarity measures and hierarchical clustering methods.

### MongoDB structure

Right now the structure of MongoDB is to have a different collection for each major unit of operation which are connected through unique OIDs. This is the recommended structure to avoid destructive data transformations and to keep a relatively flat hierarchy. GridFS is used for large (16mb+) models.

Considering using Redis for local caching in the future, but for now, MongoDB is only written to by workers and read by the NextJS API.

### Query Workflow

The concept of interacting with this system is based around querying and browsing. You might have some idea of what you want to look for, but you don't yet know the exact relationships between words and documents and would like to discover them. The workflow would be:

- come up with an interesting query and enter it
- see an immediate document count
- enter another query to compare it
- repeat until you have found a doc count and query set that you can deal with (emotionally, intellectually, computationally)

In the background, each query will have started a whole chain of NLP processing. Documents are fetched, turned into dictionaries and bag-of-words corpuses, and TFIDF scores are calculated. Although this may change soon, right now, a model of word similarities built from Wikipedia is used to calculate a Soft Cosine Similarity index which allows you to use the index as a lookup for further subqueries. Since a whole document can be used as a query, this can be used to build Docs x Docs similarity matrices if needed.

Now that you have a set of documents and at least two similarity measures (TFIDF for Words X Docs and Soft Cosine Similarity for Words or Docs x Docs), you can start to manually include/exclude documents and words. The exact way this works is still TBD but essentially we can imagine:

- Docs can be included in groups to indicate similarity manually
- Docs can be excluded from base query sets to remove them from any further modelling within that query on the next recalculation
- Words can be included in groups to indicate simiarity manually
- Words can be excluded from dictionaries to remove them as features of the models

It may be useful to train small Word2Vec models on document subsets and then retrain as more documents are confirmed added to groups. This may be useful to reflect the qualitative methodology of thematic analysis. Therefore the full process is encapsulated in four stages:

- Browse queries to find proposed documents
- Inspect the documents to see whether the proposed documents were useful, make notes, do initial qualitative analysis steps of annotation
- Refine queries to create groups of words and documents
- Recalculate models based on your current staged changes

My current challenge is figuring out how to manage the include/exclude process with MongoDB (views??) and how to manage recording state. Since I like being able to recalculate the whole process (and likely needs to be included for reproducibility reasons), this should likely be done similar to design programs that use constraint-based functional modelling (like SolidWorks) but TBD.

## Version 0.1.0

## Setup

This project is basically a front end build in [Bootstrap](https://getbootstrap.com/) for [Scikit Learn](https://scikit-learn.org/stable/install.html) and uses [Numpy](https://numpy.org/) for most scientific computing. The database it expects is [MongoDB](https://www.mongodb.com/) and uses [Socket.io](https://socket.io/) to communicate between back and front ends. Oh, and [D3.js](https://d3js.org/) powers the visualization. Because of all the different technologies at play here, I wanted to avoid React and Flask, so there are some funny-looking hacks that you'll see as a result. I'm using [Anaconda](https://www.anaconda.com/) to manage the development environment.

The packages should include all of the web technologies, so you will only have to install the python packages for the above. You can use `pip install` for most with no problem, but I suggest setting up a conda virtual environment first. I will assume a prebuilt MongoDB database for this version with documentation below.

### Suggested installation workflow

1. Install Anaconda, then go to a terminal and `conda activate <virtual environment name>`.
2. Install Scikit Learn.
3. Install the following supporting packages with this handy copy-paste code:

```
pip install socketio
pip install pymongo
pip install bottleneck
pip install progressbar
```

Test the install by running `python async-server.py`. If anything blows up because it is missing, install that package and complain to the owners. Navigate to http://localhost:8080/dashboard/index.html in a browser to see if everything loads.

This first in-development version release has been set up to do three important things:

- Search the database for documents given a query
- Run TF-IDF on the documents, producing a TF-IDF matrix for each word
- Run cosine similarity on the documents, producing document similarity scores

Given these functions, we can start the process of iterated semi-supervised learning on the documents provided. That is not yet included in this version, but will be the next step in the project. Each subsection below will overview the major concepts that the UI uses and actions that a user will take to filter the database.

### Frontend

The high-level idea for this interface is to enable learning-through-browsing. You want to be able to eventually get an idea of your big corpus, but also have small, local ideas of what you are interested in as part of building towards an eventual qualitative thematic analysis. The design descisions are focused around making the browsing process and the process of thematic analysis actually create better machine learning models that can be used in further document exploration.

#### Defining stopwords

The UI provides a quick way to filter through stopwords. You can use Min/Max document frequency scores to do automatic filtering, or browse through with manual filtering. Since a good automatic filter will be quite agressive (e.g., must show up in over 10 documents, and less than 25% of all documents), you need a way to pick through interesting terms that might be automatically excluded. In this interface, you do that by dragging and dropping terms between the "words" card, the "stopwords" card, and the "keywords" card.

The stopwords card is a working set that is local to the current document selection subset. You can commit the stopwords to a global stopwords set, which will remove them from the card, but remain in memory.

#### Defining keywords

Keywords are terms that are potentially useful to keep. Eventually, there will be some function to structure similarity between keywords, but right now, they are just a local set. They will be highlighted in document previews, but otherwise, they have no further function except being preserved in a set.

### Document browsing

Right now, just five random documents show up in the document browsing selection. You can drag and drop them to the "include" and "exclude" bins, but it doesn't do anything. In the very near future, this will start to build connection matrices for hierarchical clustering.

#### Backend and mechanics

The high-level idea for the backend is to create a server that produces machine learning models as a result of browsing. The rough dataflow idea is keep to unidirectional dataflow.

A server manages communication between the UI and different processes. Communication with the UI is via Websockets (socket.io python port), communcation with the database is via pymongo.

The server interacts with a TFIDFProcessorManager which manages TFIDFProcessors. Right now the server also directly calls the Processors, but I'm moving that into the mangager.

### Database setup

This project uses MongoDB as a database. MongoDB was chosen after attempts at SQL databases proved to not be flexible or cross-compatible enough for the different kinds of machine learning data structures used here.
