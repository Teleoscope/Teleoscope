# Teleoscope Overview

Teleoscope is a system for supporting qualitative research with machine learning algorithms. It addresses the problem of having to look through a large corpora of documents (i.e., in the hundreds of thousands) for themes. It works by representing each document as a high-dimensional vector using Google’s Universal Sentence Encoder (USE). Users can interact with documents using a web-based interface by grouping the documents together. When the users group documents, the machine learning system moves a search vector closer to the documents they are adding to the group. The results are displayed to users as a list of documents that are closest to the example documents they have selected to group together.

Teleoscope is the PhD project of [Paul Bucci](https://paulbucci.ca/) who is working with [Prof. Ivan Beschastnikh](https://www.cs.ubc.ca/~bestchai/) from the [Systopia Lab](https://systopia.cs.ubc.ca/) at the [University of British Columbia](https://www.ubc.ca/). Join the [Teleoscope Discord Server](https://discord.gg/GNpjvccnAX) for questions, discussions, and feature requests for Paul. Check out our [Youtube Playlist](https://www.youtube.com/playlist?list=PLfTo3bBE97a0_GllWl9RzzPb9GpwRuayP) for a tutorial on how to use Teleoscope.

![keywords aren't enough](images/keywords.png)

The problem that Teleoscope addresses is that keyword searches are based on textual similarities between words. However, we want semantic similarities to be the basis of our searches. The above figure (which is an annotated screenshot of the interface) depicts a conceptual similarity between WiFi and Netflix in that they are both types of accounts that people often share among family and friends. A keyword search could not capture the similarity between those concepts. But our Teleoscope system can by using the USE document embeddings.

![search by example](images/search-by-example.png)

To develop themes, users start with a keyword search, but then start to search by example. The above figure depicts two documents that were found when searching for “endometriosis” as a keyword. However, if the user was attempting to develop a theme based on personal relationships rather than workplace conflicts, they could move the Teleoscope search vector closer to the left document by adding it to a group and selecting it.

![compare searchers](images/compare-searches.png)

As shown in the above figure, that will give a set of results that are more semantically similar to the selected document, which, in this case, shows documents that are about endometriosis AND relationships, but without having to explicitly search for those two terms as keywords.

![workflow](images/teleoscope-workflow.png)

The workflow for developing themes is as shown in the above figure. The user iteratively searches for keywords, reads the relevant documents, groups them together and selects the documents to train the Teleoscope system with, then repeats. There is also an experimental clustering feature that allows you to use the system to create groups automatically based on the groups you have given it so far.

## Installation

### Option 1: Docker (quickest)

Get the full stack running with one command:

```bash
cp .env.example .env
docker compose up -d
```

The app will be at **http://localhost:3000**. MongoDB, RabbitMQ, Milvus, and all workers (dispatch, graph, vectorizer, uploader, tasks, files API) start automatically. After the stack is up, run `./scripts/test-stack.sh` to verify connectivity.

**Conference demo mode (public/no-login):**

- Run `./scripts/one-click-demo.sh`
- Open `http://localhost:3000/demo`
- Demo route serves 1000 baked-in reddit-style posts (`teleoscope.ca/src/lib/demoData.ts`) and interactive set operations without login/dashboard.

**Tests:** CI includes fast frontend/backend checks plus a chunked full-stack Playwright workflow (`.github/workflows/test.playwright.yml`) with separate core/demo and vectorization jobs: PRs run the stable core/demo bundle, while full 1000-doc vectorization runs on schedule/manual dispatch. This avoids repeated timeout loops while keeping full coverage. Also includes a demo API load smoke test. Modular frontend tests run with `cd teleoscope.ca && pnpm test:unit`, and API/frontend contract alignment checks run with `tests/api-frontend-contract.spec.ts` + `tests/api.spec.ts` (see [TESTING.md](TESTING.md)).

> **Note:** First run will take several minutes to build images and pull the embedding model. For GPU acceleration (NVIDIA), use:
> ```bash
> docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
> ```
> Requires [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Option 2: Ansible (VM deployment)

For production or VM deployment:

1. Copy the example vars and inventory:
   ```bash
   cp ansible/vars/vars.yaml.example ansible/vars/vars.yaml
   cp ansible/vars/inventory.yaml.example ansible/vars/inventory.yaml
   ```

2. Edit `ansible/vars/vars.yaml` with your MongoDB, RabbitMQ, and auth credentials.

3. Run the full playbook:
   ```bash
   ansible-playbook -i ansible/vars/inventory.yaml ansible/newteleoscope.yaml
   ```

For a separate vectorizer machine, use `ansible/newvectorizer.yaml`.

### Option 3: Frontend-only development

Run the web app against a remote backend:

```bash
cd teleoscope.ca
cp ../.env.example .env.local
# Edit .env.local with your backend URLs
pnpm install && pnpm schema && pnpm dev
```

### Option 4: Local stack without Docker (e.g. macOS in UTM)

If you can't run Docker (e.g. hypervisor limits in a VM), run and test everything except the vector pipeline on this machine:

1. **One-time:** `./scripts/setup-local-macos.sh` then `brew services start mongodb-community rabbitmq`
2. **Start stack:** `mamba activate teleoscope && ./scripts/start-local-stack.sh`
3. **Test:** Unit tests (pytest, vitest), `./scripts/test-stack.sh`, and Playwright for non-vector flows.

Vector search and embedding require Milvus (no native macOS server); those are tested in CI or on a host with Docker. See [docs/TESTING-WITHOUT-DOCKER.md](docs/TESTING-WITHOUT-DOCKER.md).

### Mamba/Conda environment

If you use [mamba](https://mamba.readthedocs.io/) (or conda) to manage Node/Python per project:

```bash
mamba env create -f environment.yml
mamba activate teleoscope
```

This gives you Node 22, pnpm, and Python 3.11 in an isolated env. Then run `pnpm install` in `teleoscope.ca` and `pip install -r backend/requirements.txt` for full backend deps.

# Technical notes
Teleoscope is designed from the ground-up to make use of distributed and cloud-based computing. This means that there is a steep learning curve for people who would like to become involved in the prokect. If you are just getting started, here are some of the technologies that you will need to learn:

## Frontend: React, NextJS, and MUI
The frontend is built using [React](https://reactjs.org/) via the [NextJS](https://nextjs.org/) framework. Most components are customizations of [MUI](https://mui.com/) components. Our interaction and windowing system is based on [React Flow](https://reactflow.dev/).

If you'd like to get started developing for the Teleoscope frontend, create a starter project (e.g., [by following the NextJS tutorials](https://nextjs.org/learn/foundations/about-nextjs)) and add in MUI components. Next, try a [Redux](https://redux.js.org/) tutorial to see how to manage local frontend state.

## Backend: MongoDB, RabbitMQ, and Celery
The technologies that allow us to create a distributed processing system are [RabbitMQ](https://www.rabbitmq.com/) and [Celery](https://docs.celeryq.dev/en/stable/index.html). After installing, work through the examples in the [Celery starter guide](https://docs.celeryq.dev/en/stable/getting-started/introduction.html).

Our database is [MongoDB](https://www.mongodb.com/). After installing MongoDB, you can install [MonogoDB Compass](https://www.mongodb.com/products/compass) as a graphical user interface for searching through the database.

## Machine Learning: USE, UMAP, and HDBSCAN
Our machine learning pipeline starts by encoding document text with [Universal Sentence Encoder](https://www.tensorflow.org/hub/tutorials/semantic_similarity_with_tf_hub_universal_encoder). This allows us to create similarity scores for words/sentences that may have low or no representation in user datasets. When users have created groups, we then perform dimensionality reduction with [UMAP](https://umap-learn.readthedocs.io/en/latest/supervised.html). 

You can think of it like this: when the user creates a group, they are saying that they believe that the documents are similar, whether or not the USE model would consider them to be very close. Rather than recalculating a whole new model, we simply decide to reduce dimensions with a custom distance metric that says "documents in the same group should end up close when dimensions are cut." The space is then transformed without having to retrain a neural network, which could take a very long time. Then, we perform clustering using [HDBSCAN](https://hdbscan.readthedocs.io/en/latest/how_hdbscan_works.html) and present the machine-created clusters to users. If they like the clusters, they can add them as groups and re-run the clustering.

## Cloud-first design
Teleoscope is easily deployable to new VMs using the [Ansible](https://www.ansible.com/) framework. You'll need your own AWS or Azure account and VMs to run public instances of Teleoscope, but you can create a test environment by creating an [vars/inventory.yaml](https://docs.ansible.com/ansible/latest/inventory_guide/index.html) that includes, say, `localhost` for your own machine, or any other host you may have access to. You'll need to create a [vars/vars.yaml](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html) file to house the following variables. You can just copy-paste the following and replace defaults with your own values:

```
remote_prefix: /home                              # example for linux 
conda_environment: teleoscope                     # any label will do
conda_prefix: /usr/share/miniconda3               # you can change this to ~/miniconda3 if you don't have access to /usr/share
mongodb_admin_name: example_admin                 # replace "example_admin" with your administrator name
mongodb_admin_password: admin_password            # replace "admin_password" with your administrator's password
mongodb_dev_name: example_dev                     # replace "example_dev" with your name
mongodb_dev_password: dev_password                # replace "dev_password" with your password
mongodb_database: teleoscope                      # any label will do
rabbitmq_vhost: teleoscope                        # any label will do
rabbitmq_admin_username: example_admin            # replace "example_admin" with your administrator name (can be different than above)
rabbitmq_admin_password: admin_password           # replace "admin_password" with your administrator's password (can be different than above)
rabbitmq_dev_username:  example_dev               # replace "example_dev" with your name (can be different than above)
rabbitmq_dev_password: dev_password               # replace "dev_password" with your password (can be different than above)
nodejs_version: 19                                # tested for 19
ubuntu_version: jammy                             # tested for focal and jammy, may need to change some configs for focal
```
