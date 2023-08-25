# boilerplate
import numpy as np
import logging
from bson.objectid import ObjectId
from pymongo import database
from random_object_id import generate
import random

# ml dependencies
import umap
import hdbscan
from sklearn.metrics.pairwise import euclidean_distances, cosine_distances
import spacy

# local files
from . import utils
from . import tasks
from . import auth
from . import schemas
from . import graph

class Projection:
    """Semi-supervised Clustering 

    The purpose of this class is to cluster a corpus--limited to a subset defined 
    by the limit param plus the documents in the provided human clusters/groups.
    """

    def __init__(
            self, 
            db: database.Database, 
            sources, 
            controls, 
            projection_id,
            ordering, 
            separation,
            limit=20000, 
            topic_label_length=2):
        """Initializes the instance 

        Args:
            sources:
                list of source inputs: group, document, search, note 
            controls:
                list of control inputs: group, document, search, note 
            limit:
                Limits the size of n
            ordering:
                Metric for subsetting feature space
                    random: random subset
                    average: ranked ordering w/ respect to average vector of labelled documents
            topic_label_length:
                Minimum number of words to use for machine cluster topic labels. Default 2
        """


        self.db = db
        self.sources = sources
        self.controls = controls
        self.n = limit
        self.topic_label_length = topic_label_length
        self.ordering = ordering
        self.separation = separation
        self.group_doc_indices = None
        self.groups = []
        self.pid = ObjectId(str(projection_id))

        # large lists (number of examples)
        self.nlp = spacy.load("en_core_web_sm")
        self.document_ids = None    
        self.hdbscan_labels = None
        self.doclists = []
        self.user_groups = []
        self.doc_groups = []

    def clustering_task(self):
        """Cluster documents using user-defined groups.
        """

        # build distance matrix, run dimensionality reduction, run clustering
        self.learn_clusters()

        # iteratively add clusters (as groups) to database
        self.build_clusters()

        # append updated user groups to head
        self.doclists = self.user_groups + self.doclists

        return self.doclists

    def learn_clusters(self):
        """ Learn cluster labels: build distance matrix, run dimensionality reduction, run clustering
        """

        # build training set
        self.db.graph.update_one({"_id": self.pid}, { "$set": { "status": "processing source input... (1/4)"} })
        dm = self.document_ordering()

        """
            best params from march:
            n_components = 30, min_dist = 1e-5, min_cluster_size = 10, cluster_selection_epsilon = 0.2

            notes from turning:
                - dont hit thresh. if min_cluster_size > 7-8
                - increase min samples, increase clusters
                - increase epsilon, decrease clusters
                - large n_components requires larger n_neighbors
                - increasing n_neighbors, decreases clusters
                - n_components greater than 10 are much the same, less than 10 are bad.
                - 11 was most frequent nn for thresh.
                - https://maartengr.github.io/BERTopic/getting_started/parameter%20tuning/parametertuning.html#umap
        """

        n_components = random.randint(7, 12) #7
        n_neighbors = random.randint(10, 15) #15 
        min_dist = random.uniform(1e-4, 0.05) # 0.029184 # 1e-4


        logging.info("Running UMAP Reduction...")
        self.db.graph.update_one({"_id": self.pid}, { "$set": { "status": "projecting control input... (2/4)"} })
        
        umap_embeddings = umap.UMAP(
            metric = "precomputed", # use distance matrix
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist
        ).fit_transform(dm)
        
        self.db.graph.update_one({"_id": self.pid}, { "$set": { "status": "clustering... (3/4)"} })

        logging.info("Running HDBSCAN clustering...")
        logging.info('---------------------------------------')
        logging.info('{:<7s}{:<10s}'.format('Epoch','Num. Clusters'))
        logging.info('---------------------------------------')

        i, num_clust, max_epochs = 0, 0, 10
        min_cluster_size, min_samples, cluster_selection_epsilon = 0, 0, 0.0

        while (num_clust < 10 or num_clust > 100):
        
            min_cluster_size = 20#random.randint(10, 15) #11
            min_samples = 15 #random.randint(10, 15)#12
            cluster_selection_epsilon = 0.1 #random.uniform(0.26, 0.29) #0.270212
                
            self.hdbscan_labels = hdbscan.HDBSCAN(
                min_cluster_size = min_cluster_size,              # num of neighbors needed to be considered a cluster (0~50, df=5)
                min_samples = min_samples,                  # how conservative clustering will be, larger is more conservative (more outliers) (df=None)
                cluster_selection_epsilon = cluster_selection_epsilon,    # have large clusters in dense regions while leaving smaller clusters small
                                                                        # merge clusters if inter cluster distance is less than thres (df=0)
            ).fit_predict(umap_embeddings)

            num_clust = len(set(self.hdbscan_labels))
            i+=1 #epoch

            logging.info('{:<7d}{:<10d}'.format(i,num_clust))

            if i == max_epochs: break
        
        logging.info('---------umap-hyperparameters----------')
        logging.info('{:<28s}{:<5d}'.format('n_components:',n_components))
        logging.info('{:<28s}{:<5d}'.format('n_neighbors:',n_neighbors))
        logging.info('{:<28s}{:<5f}'.format('min_dist:',min_dist))
        logging.info('--------hdbscan-hyperparameters--------')
        logging.info('{:<28s}{:<5d}'.format('min_cluster_size:',min_cluster_size))
        logging.info('{:<28s}{:<5d}'.format('min_samples:',min_samples))
        logging.info('{:<28s}{:<3f}'.format('cluster_selection_epsilon:',cluster_selection_epsilon))

        logging.info('---------------results-----------------')
        logging.info('{:<28s}{:<5d}'.format('number of clusters:',len(set(self.hdbscan_labels))))


    def build_clusters(self):
        """ Iteratively builds groups in mongoDB relative to clustering
        """

        self.db.graph.update_one({"_id": self.pid}, { "$set": { "status": "labelling clusters... (4/4)"} })

        # identify what machine label was given to each group
        given_labels = self.get_given_labels()

        # keep track of all topic labels (for collisions)
        topic_labels = []
      
        logging.info('---------------------------------------')
        logging.info('{:<20s}{:<4s}'.format('Label','Num. Docs'))
        logging.info('---------------------------------------')

        # create a new mongoDB group for each machine cluster
        for hdbscan_label in set(self.hdbscan_labels):
            
            # array of indices of documents with current hdbscan label
            document_indices_array = np.where(self.hdbscan_labels == hdbscan_label)[0]
            
            # all document_ids as array
            ids = np.array(self.document_ids)
            
            # array of object ids of documents with current hdbscan label 
            label_ids = ids[document_indices_array]

            # create list of document object ids that are in current hdbscan label
            documents = label_ids.tolist()
            
            # create appropriate label for current hdbscan label
            _label, _color, _description = self.get_label(hdbscan_label, given_labels)
            
            # learn a topic label for if current cluster is a machine cluster
            if _label == 'machine':
                limit = min(20, len(label_ids))
                _label, _description = self.get_topic(label_ids[:limit], topic_labels)
                topic_labels.append(_label)

            # logging.info(f'Cluster: "{_label}" has {len(documents)} documents')
            logging.info('{:<20s}{:<4d}'.format(_label,len(documents)))
            
            self.add_cluster(documents, _label, _color, _description)
        
        # clear any groups that were made for individual document inputs
        for group in self.doc_groups:
            self.db.groups.delete_one({"_id": group}) 

    def get_given_labels(self):
        """ Build the given_labels dictionary

        Returns:
            given_labels:
                dict where keys are group names and values are the given hdbscan label
        """
        
        given_labels = {}
        for group in self.group_doc_indices:
            
            # list of labels given to docs in group
            labels = self.hdbscan_labels[self.group_doc_indices[group]] 
            # get non -1 label (if exists)
            correct_label = -1 if len(labels) == 0 else max(labels)
            
            # if any documents were given -1, make sure they are set to correct_label
            if -1 in labels:
                for i in range(len(labels)):
                    if labels[i] == -1:
                        index = self.group_doc_indices[group][i]
                        self.hdbscan_labels[index] = correct_label
            
            given_labels[group] = correct_label

        return given_labels
    
    def document_ordering(self):
        """ Build a training set besed on the average of groups' document vectors

        Returns:
            dm:
                a diagonal matrix containing where elements are distances between documents
        """

        for c in self.controls:
            match c["type"]:
                case "Document":
                    # create temp group
                    doc = self.db.documents.find_one({"_id": c["id"]})
                    obj = schemas.create_group_object(
                        "#FF0000", 
                        [c["id"]], 
                        f"{doc['title']}", 
                        "Initialize group", 
                        ObjectId(generate()), # random id
                        "Group from Document",
                        ObjectId(generate()), # random id
                    )
                    # Initialize group in database
                    res = self.db.groups.insert_one(obj)
                    oid = res.inserted_id
                    group = self.db.groups.find_one({"_id": oid})
                    self.doc_groups.append(oid)
                    self.groups.append(group)

                case "Group":
                    group = self.db.groups.find_one({"_id": c["id"]})
                    self.groups.append(group)

                case "Union" | "Difference" | "Intersection" | "Exclusion":
                    node = self.db.graph.find_one({"_id": c["id"]})
                    node_doclists = node["doclists"]
                    
                    # TODO - doclists labels should include control type and title
                    # label = f'{c["type"]} of ' 
                    # for control in node["edges"]["control"]:
                    #     match control["type"]:
                    #         case "Document": 
                    #             source = self.db.documents.find_one({"_id": control["id"]})
                    #             title = source["title"]
                    #             label += f'{control["type"]}: {title}'

                    #         case "Group": 
                    #             source = self.db.groups.find_one({"_id": control["id"]})
                    #             title = source["history"][0]["label"]
                    #             label += f'{control["type"]}: {title}'
                            
                    #         case "Search": 
                    #             source = self.db.searches.find_one({"_id": control["id"]})
                    #             title = source["history"][0]["query"]
                    #             label += f'{control["type"]}: {title}'

                    for doclist in node_doclists:
                        ids = [d[0] for d in doclist["ranked_documents"]]
                        
                        label = f'{c["type"]} on {doclist["type"]}' 

                        match doclist["type"]:
                            case "Document": 
                                source = self.db.documents.find_one({"_id": doclist["id"]})
                                title = source["title"]
                                label += f': {title}'

                            case "Group": 
                                source = self.db.groups.find_one({"_id": doclist["id"]})
                                title = source["history"][0]["label"]
                                label += f': {title}'
                            
                            case "Search": 
                                source = self.db.searches.find_one({"_id": doclist["id"]})
                                title = source["history"][0]["query"]
                                label += f': {title}'

                        obj = schemas.create_group_object(
                            "#FF0000", 
                            ids, 
                            f"{label}", 
                            "Initialize group", 
                            ObjectId(generate()), # random id
                            f'Group from {c["type"]}',
                            ObjectId(generate()), # random id
                        )
                        # Initialize group in database
                        res = self.db.groups.insert_one(obj)
                        oid = res.inserted_id
                        group = self.db.groups.find_one({"_id": oid})
                        self.doc_groups.append(oid)
                        self.groups.append(group)

                case "Search":
                    pass
                case "Note":
                    pass

        logging.info("Gathering all document vectors from embeddings...")
        # grab all document data from embeddings
        all_doc_ids, all_doc_vecs = utils.get_documents(self.db.name)
        if len(all_doc_ids) < self.n:
            self.n = len(all_doc_ids)

        # if sources = 0: average ordering of conrolls for all[30000]
        logging.info('Gathering Document IDs...')

        if len(self.sources) == 0:
            
            logging.info(f"n = {self.n}")

            if self.ordering == "average":
                logging.info('No sources. Using average ordering...')
                
                # build a list of ids of documents in all groups 
                docs = []
                for group in self.groups:
                    group_document_ids = group["history"][0]["included_documents"]
                    docs += group_document_ids
                
                # get control vectors
                control_vecs = [all_doc_vecs[all_doc_ids.index(oid)] for oid in docs]
                source_vecs = np.array(all_doc_vecs)
                ranks = graph.rank(control_vecs, all_doc_ids, source_vecs, self.n)
                document_ids = [i for i,s in ranks] 
            
            if self.ordering == "random":
                logging.info('No sources. Using random ordering...')
                document_ids = random.sample(all_doc_ids, self.n)

        else:
            # if sources > 0: sources U controls 
            logging.info(f'{len(self.sources)} sources. Combining docs from sources...')

            document_ids = []
            full_search_input = False # check to disallow more than one full search input

            for source in self.sources:
                match source["type"]:
                    case "Document":
                        document_ids.append(source["id"])

                    case "Group":
                        group = self.db.groups.find_one({"_id": source["id"]})
                        docs =  group["history"][0]["included_documents"]
                        document_ids += [ObjectId(str(id)) for id in docs]

                    case "Search":
                        search = self.db.searches.find_one({"_id": source["id"]})
                        query = search["history"][0]["query"]
                        
                        if query != "":
                            cursor = self.db.documents.find(utils.make_query(query),projection={ "_id": 1}).limit(self.n)
                            document_ids += [d["_id"] for d in list(cursor)]
                        elif query == "" and full_search_input is False:
                            document_ids += random.sample(all_doc_ids, self.n)
                            full_search_input = True

                    case "Union" | "Difference" | "Intersection" | "Exclusion":
                        node = self.db.graph.find_one({"_id": source["id"]})
                        node_doclists = node["doclists"]
                        for doclist in node_doclists:
                            document_ids += [d[0] for d in doclist["ranked_documents"]]

                    case "Note":
                        pass
            
            # remove duplicate ids
            document_ids = list(set(document_ids))
            self.n = len(document_ids)
            logging.info(f"n = {self.n}")

 
        # Create a dictionary to store the indices of all_doc_ids
        index_dict = {all_doc_ids[i]: i for i in range(len(all_doc_ids))}

        # Get the indices of document_ids using the dictionary
        indices = [index_dict[i] for i in document_ids]

        logging.info('Gathering Document Vectors...')
        # use indices of ranked ids to build sorted array of document vectors
        document_vectors = np.array([all_doc_vecs[i] for i in indices])
        # dict where keys are group names and values are indices of documents
        group_doc_indices = {}
        
        # make sure documents in groups are included in training sets
        logging.info("Appending documents from input groups...")
        for group in self.groups:

            group_document_ids = group["history"][0]["included_documents"]

            indices = []

            for str_id in group_document_ids:

                # see if document is already in training sets
                try:
                    id = ObjectId(str(str_id))
                    document_ids.index(id)

                # if not add document to training sets
                except:
                    document = self.db.documents.find_one(
                        {"_id": id},
                        projection={'textVector': 1},
                    )
                    if not document: raise Exception(f"Document {str(id)} not found")
                    document_ids.append(id)
                    vector = np.array(document["textVector"]).reshape((1, 512))
                    document_vectors = np.append(document_vectors, vector, axis=0)

                # get index of document in group with respect to training sets
                finally:
                    indices.append(document_ids.index(id))

            group_doc_indices[group["history"][0]["label"]] = indices

        # build distance matrix
        logging.info("Building distance matrix...")
        dm = cosine_distances(document_vectors)
        logging.info(f"Distance matrix has shape {dm.shape}.") # n-by-n symmetrical matrix

        # update distance matrix such that documents in the same group have distance ~0
        INTRA_CLUSTER_DISTANCE = 1e-3

        for group, indices in group_doc_indices.items():
            for i in indices:
                dm[i, indices] *= INTRA_CLUSTER_DISTANCE

        if self.separation:
            # update distance matrix such that documents in the differnet groups have distance 1
            logging.info("Separating control groups...")

            INTER_CLUSTER_DISTANCE = 1

            for group_i, indices_i in group_doc_indices.items():
                for group_j, indices_j in group_doc_indices.items():
                    if group_i != group_j:
                        for i in indices_i:
                            for j in indices_j:
                                dm[i, j] = INTER_CLUSTER_DISTANCE

        self.group_doc_indices = group_doc_indices
        self.document_ids = document_ids

        return dm

    def get_label(self, hdbscan_label, given_labels):
        """Identify and produce label & colour for given hdbscan label

        Args:
            hdbscan_label:
                An int that represents the given machine label 
            given_labels:
                dict where keys are group names and values are the given hdbscan label

        Returns:
            label:
                A string that is the topic label for the machine cluster
            colour:
                A string of hex representing a colour
        """
        
        check = more = False
        
        # outlier label
        if hdbscan_label == -1:
            return 'outliers', '#ff1919', "outlier documents"

        # check if hdbscan_label was for a human cluster(s)
        for _name in given_labels:

            label = given_labels[_name]
            
            if (hdbscan_label == label):
                
                # append group labels if multiple human clusters are given the same hdbscan label
                if more:
                    name += " & " + _name 

                # on first instance of label match, just return name
                else:
                    name = _name
                    check = more = True
        
        if check:
            return name, '#ff70e2', "your group"

        # return for if label is newly generated machine cluster
        return 'machine', '#737373', ''

    def get_topic(self, label_ids, topic_labels):
        """Provides a topic label for a machine cluster

        Args:
            label_ids: 
                An array of strings that represent documents ids in a machine cluster.
            topic_lables:
                list of all given labels to machine clusters

        Returns:
            topic:
                A string that is the topic label for the machine cluster
            description:
                A 10 word machine generated description 
        """

        docs = [] 
        
        # build a small corpus of documents that represent a machine cluster
        for id in label_ids:
            document = list(self.db.documents.find(
                {"_id": ObjectId(str(id))},
                projection = {'text': 1},
            ))
            docs.append(document[0]["text"])
            
        # use spaCy to preprocess text
        docs_pp = [self.preprocess(text) for text in self.nlp.pipe(docs)]

        # transform as bag of words with tf-idf strategy
        from sklearn.feature_extraction.text import TfidfVectorizer
        vec = TfidfVectorizer()
        try:
            X = vec.fit_transform(docs_pp)
        except:
            return "generic cluster", "documents only contain stop words"

        # apply LDA topic modelling reduction
        from sklearn.decomposition import LatentDirichletAllocation
        lda = LatentDirichletAllocation(
            n_components=1, 
            learning_method="batch", 
            max_iter=10
        )
        lda.fit_transform(X)

        # grab two most similar topic labels for machine cluster
        sorting = np.argsort(lda.components_, axis=1)[:, ::-1]
        feature_names = np.array(vec.get_feature_names_out())

        label = ""
        for i in range(self.topic_label_length):
            if i > 0: label += " "
            try:
                label += feature_names[sorting[0][i]]
            except:
                pass

        # build a 7 word description from frequent topic labels
        description = feature_names[sorting[0][0]]
        for i in range(1, min(8, len(sorting[0]))):
            description += " " + feature_names[sorting[0][i]]

        # check for collisions with existing labels; if yes, append another topic label. 
        i = self.topic_label_length
        while(1):
            if label not in topic_labels:
                return label, description
            else:
                label += " " + feature_names[sorting[0][i]]
                i += 1

    def preprocess(self, doc):
        """Preprocess text

        Code by Dr. Varada Kolhatkar adapted from UBC CPSC 330

        Given text, min_token_len, and irrelevant_pos carry out preprocessing of the text
        and return a preprocessed string.

        Args:
            doc:
                The spacy doc object of the text

        Returns:
            preprocessed_text:
                Preprocessed text as a String
        """
                
        # An int that represents min_token_length required
        min_token_len = 2
        # A list of irrelevant pos tags
        irrelevant_pos = ["ADV", "PRON", "CCONJ", "PUNCT", "PART", "DET", "ADP", "SPACE"]

        clean_text = []

        for token in doc:
            if (
                token.is_stop == False  # Check if it's not a stopword
                and len(token) > min_token_len  # Check if the word meets minimum threshold
                and token.pos_ not in irrelevant_pos
            ):  # Check if the POS is in the acceptable POS tags
                lemma = token.lemma_  # Take the lemma of the word
                clean_text.append(lemma.lower())
        return " ".join(clean_text) 
    
    def add_cluster(self, documents, label, color, description):
        """
        Adds a cluster to projection
        """

        doclist = {
            "ranked_documents": [(d, 1.0) for d in documents],
            "label": label,
            "color": color,
            "description": description,
            "type": "Cluster"
        }

        if description == "your group":
            self.user_groups.append(doclist)
        else:
            self.doclists.append(doclist)
        
