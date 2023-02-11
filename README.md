# README

Telescope is a system for supporting qualitative research with machine learning algorithms. It addresses the problem of having to look through a large corpora of documents (i.e., in the hundreds of thousands) for themes. It works by representing each document as a high-dimensional vector using Google’s Universal Sentence Encoder (USE). Users can interact with documents using a web-based interface by grouping the documents together. When the users group documents, the machine learning system moves a search vector closer to the documents they are adding to the group. The results are displayed to users as a list of documents that are closest to the example documents they have selected to group together.

## Installation
Installation right now is oriented toward VM deployment, but if you want a local install, you can create an Ansible inventory which lists `localhost` as the target deployment.

For general development, it's recommended to go through the full Ansible install locally.

For frontend-only development, you can run `npm i` in `frontend` and then `npm run dev` to run the webpack development server on `localhost:3000`.
