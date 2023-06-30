from celery import Celery, Task, chain

class reorient(Task):
    """
    Class-based task which allows us to maintain the model state.
    """

    def __init__(self):
        self.documentsCached = False
        self.allDocumentIDs = None
        self.allDocumentVectors = None
        self.db = None
        self.client = None
        self.model = None
        self.dbstring = None

    def cacheDocumentsData(self):
        # cache embeddings
        from pathlib import Path
        dir = Path(f'~/embeddings/{self.dbstring}/').expanduser()
        dir.mkdir(parents=True, exist_ok=True)
        npzpath = Path(f'~/embeddings/{self.dbstring}/embeddings.npz').expanduser()
        pklpath = Path(f'~/embeddings/{self.dbstring}/ids.pkl').expanduser()
        
        if npzpath.exists() and pklpath.exists():
            logging.info("Documents have been cached, retrieving now.")
            loadDocuments = np.load(npzpath.as_posix(), allow_pickle=False)
            with open(pklpath.as_posix(), 'rb') as handle:
                self.allDocumentIDs = pickle.load(handle)
            self.allDocumentVectors = loadDocuments['documents']
            self.documentsCached = True
        else:
            logging.info("Documents are not cached, building cache now.")
            self.connect()
            allDocuments = utils.getAllDocuments(self.db, projection={'textVector':1, '_id':1}, batching=True, batchSize=10000)
            ids = [str(x['_id']) for x in allDocuments]
            logging.info(f'There are {len(ids)} ids in documents.')
            vecs = np.array([x['textVector'] for x in allDocuments])

            np.savez(npzpath.as_posix(), documents=vecs)
            with open(pklpath.as_posix(), 'wb') as handle:
                pickle.dump(ids, handle, protocol=pickle.HIGHEST_PROTOCOL)
            self.allDocumentIDs = ids
            self.allDocumentVectors = vecs
            self.documentsCached = True
        
        return self.allDocumentIDs, self.allDocumentVectors


    def computeResultantVector(self, positive_docs, negative_docs):
        """
        Computes the resultant vector for positive and negative docs.
        Resultant vector is the final vector that the stateVector of
        the teleoscope should move towards/away from.

        Args:
            positive_docs: docs to move towards
            negative_docs: docs to move away from

        Returns:
            resultantVec: new Teleoscope vector (np.array[512])
            direction: direction to move (int: 1, -1)
        """        
        # get vectors for positive and negative doc ids
        # using utils.getDocumentVector function
        # TODO: OPTIMIZE

        posVecs = []  # vectors we want to move towards
        for pos_id in positive_docs:
            v = utils.getDocumentVector(self.db, pos_id)
            posVecs.append(v)

        negVecs = []  # vectors we want to move away from
        for neg_id in negative_docs:
            v = utils.getDocumentVector(self.db, neg_id)
            negVecs.append(v)

        avgPosVec = None  # avg positive vector
        avgNegVec = None  # avg negative vector
        direction = 1  # direction of movement

        # handle different cases of number of docs in each list
        if len(posVecs) >= 1:
            avgPosVec = np.array(posVecs).mean(axis=0)
        if len(negVecs) >= 1:
            avgNegVec = np.array(negVecs).mean(axis=0)

        # if both lists are not empty
        if avgPosVec is not None and avgNegVec is not None:
            resultantVec = avgPosVec - avgNegVec
        # if only negative list has entries
        elif avgPosVec is None and avgNegVec is not None:
            resultantVec = avgNegVec
            # change direction of movement since we want to move away in this case
            direction = -1
        # if only positive list has entries
        elif avgPosVec is not None and avgNegVec is None:
            resultantVec = avgPosVec
        
        resultantVec /= np.linalg.norm(resultantVec)
        return resultantVec, direction

    def average(self, documents: list):
        self.connect()
        document_vectors = []
        for doc_id in documents:
            print(f'Finding doc {doc_id}')
            # Define the aggregation pipeline
            pipeline = [
                { '$match': { "_id" : ObjectId(str(doc_id)) } },
                {
                    '$unionWith': {
                        'coll': 'notes',
                        'pipeline': [
                            { '$match': { "_id" : ObjectId(str(doc_id)) } }
                        ]
                    }
                }
            ]

            # Execute the aggregation query
            result = list(self.db.documents.aggregate(pipeline))
            print("result", result)

            # # Process the result
            # for document in result:
            #     # Process each document
            #     print(document)

            # doc = self.db.documents.find_one({"_id": ObjectId(str(doc_id))})
            document_vectors.append(result[0]["textVector"])
        vec = np.average(document_vectors, axis=0)
        return vec
    
    def connect(self):
        if self.db is None:
            self.db = utils.connect(db=self.dbstring)

    def run(self, edges: list, userid: str, db: str, **kwargs):
         # Check if document ids and vectors are cached
         
        if self.dbstring is None:
            self.dbstring = db

        if self.documentsCached == False:
            _, _ = self.cacheDocumentsData()

        self.connect()

        for teleoscope_id, documents in teleoscopes.items():
            vec = self.average(documents)
            teleoscope = self.db.teleoscopes.find_one({"_id": ObjectId(str(teleoscope_id))})
            scores = utils.calculateSimilarity(self.allDocumentVectors, vec)

            newRanks = utils.rankDocumentsBySimilarity(self.allDocumentIDs, scores)
            gridfs_id = utils.gridfsUpload(self.db, "teleoscopes", newRanks)

            rank_slice = newRanks[0:100]
            logging.info(f'new rank slice has length {len(rank_slice)}.')

            history_item = schemas.create_teleoscope_history_item(
                label = teleoscope['history'][0]['label'],
                reddit_ids=teleoscope['history'][0]['reddit_ids'],
                positive_docs=documents,
                negative_docs=[],
                stateVector=vec.tolist(),
                ranked_document_ids=ObjectId(str(gridfs_id)),
                rank_slice=rank_slice,
                action="Reorient teleoscope",
                user=ObjectId(str(userid))
            )

            # transaction_session, db = utils.create_transaction_session(db=self.dbstring)
            utils.push_history(self.db, None, "teleoscopes", ObjectId(str(teleoscope_id)), history_item)
            # utils.commit_with_retry(transaction_session)
        return {}
robj = app.register_task(reorient())



msg = {
    "session_id": "6426212a7848802aee0f9e83",
    "source_node": {
        "id": "649c95a518a407264b76e65f%a813324af17be2eb%group",
        "type": "Group",
        "position": {
            "x": 267,
            "y": 177
        },
        "positionAbsolute": {
            "x": 267,
            "y": 177
        },
        "style": {
            "width": 200,
            "height": 34
        },
        "data": {
            "label": "649c95a518a407264b76e65f%a813324af17be2eb%group",
            "oid": "649c95a518a407264b76e65f",
            "type": "Group",
            "uid": "a813324af17be2eb"
        },
        "width": 200,
        "height": 34,
        "selected": False,
        "dragging": False
    },
    "target_node": {
        "id": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
        "type": "Teleoscope",
        "position": {
            "x": 529,
            "y": 198
        },
        "positionAbsolute": {
            "x": 529,
            "y": 198
        },
        "style": {
            "width": 200,
            "height": 34
        },
        "data": {
            "label": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
            "oid": "649c95aa18a407264b76e662",
            "type": "Teleoscope",
            "uid": "4b672ff00e0078be"
        },
        "width": 200,
        "height": 34,
        "selected": True,
        "dragging": False
    },
    "handle_type": "source",
    "connection": {
        "source": "649c95a518a407264b76e65f%a813324af17be2eb%group",
        "sourceHandle": "649c95a518a407264b76e65f%a813324af17be2eb%group_output",
        "target": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
        "targetHandle": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope_source"
    },
    "ui_state": {
        "activeSessionID": {
            "data": None,
            "loading": False,
            "error": None,
            "userid": "637ee569d1259b1565f7e97e",
            "value": "6426212a7848802aee0f9e83"
        },
        "windows": {
            "nodes": [
                {
                    "id": "649c95a518a407264b76e65f%a813324af17be2eb%group",
                    "type": "Group",
                    "position": {
                        "x": 267,
                        "y": 177
                    },
                    "positionAbsolute": {
                        "x": 267,
                        "y": 177
                    },
                    "style": {
                        "width": 200,
                        "height": 34
                    },
                    "data": {
                        "label": "649c95a518a407264b76e65f%a813324af17be2eb%group",
                        "oid": "649c95a518a407264b76e65f",
                        "type": "Group",
                        "uid": "a813324af17be2eb"
                    },
                    "width": 200,
                    "height": 34,
                    "selected": False,
                    "dragging": False
                },
                {
                    "id": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
                    "type": "Teleoscope",
                    "position": {
                        "x": 529,
                        "y": 198
                    },
                    "positionAbsolute": {
                        "x": 529,
                        "y": 198
                    },
                    "style": {
                        "width": 200,
                        "height": 34
                    },
                    "data": {
                        "label": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
                        "oid": "649c95aa18a407264b76e662",
                        "type": "Teleoscope",
                        "uid": "4b672ff00e0078be"
                    },
                    "width": 200,
                    "height": 34,
                    "selected": True,
                    "dragging": False
                }
            ],
            "edges": [
                {
                    "source": "64640311d858c97771df504c%0c3b021edc1cbecc%group",
                    "sourceHandle": "64640311d858c97771df504c%0c3b021edc1cbecc%group",
                    "target": "646403260eac97d6f003a766%37623d286b64f2d0%teleoscope",
                    "targetHandle": "646403260eac97d6f003a766%37623d286b64f2d0%teleoscope",
                    "id": "reactflow__edge-64640311d858c97771df504c%0c3b021edc1cbecc%group64640311d858c97771df504c%0c3b021edc1cbecc%group-646403260eac97d6f003a766%37623d286b64f2d0%teleoscope646403260eac97d6f003a766%37623d286b64f2d0%teleoscope",
                    "selected": False
                },
                {
                    "source": "64640311d858c97771df504c%0c3b021edc1cbecc%group",
                    "sourceHandle": "64640311d858c97771df504c%0c3b021edc1cbecc%group",
                    "target": "649626bb56bff79bc8da2c42%37450c40a7f4c6fe%teleoscope",
                    "targetHandle": "649626bb56bff79bc8da2c42%37450c40a7f4c6fe%teleoscope",
                    "id": "reactflow__edge-64640311d858c97771df504c%0c3b021edc1cbecc%group64640311d858c97771df504c%0c3b021edc1cbecc%group-649626bb56bff79bc8da2c42%37450c40a7f4c6fe%teleoscope649626bb56bff79bc8da2c42%37450c40a7f4c6fe%teleoscope",
                    "selected": False
                },
                {
                    "source": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group",
                    "sourceHandle": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output",
                    "target": "Exclusion%ec8ddca785beea6a%exclusion",
                    "targetHandle": "Exclusion%ec8ddca785beea6a%exclusion_control",
                    "id": "reactflow__edge-649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output-Exclusion%ec8ddca785beea6a%exclusionExclusion%ec8ddca785beea6a%exclusion_control",
                    "selected": False
                },
                {
                    "source": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group",
                    "sourceHandle": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output",
                    "target": "Union%3c78904ebca9d0c2%union",
                    "targetHandle": "Union%3c78904ebca9d0c2%union_control",
                    "id": "reactflow__edge-649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output-Union%3c78904ebca9d0c2%unionUnion%3c78904ebca9d0c2%union_control",
                    "selected": False
                },
                {
                    "source": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group",
                    "sourceHandle": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output",
                    "target": "Intersection%dfc3269edab4043b%intersection",
                    "targetHandle": "Intersection%dfc3269edab4043b%intersection_control",
                    "id": "reactflow__edge-649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output-Intersection%dfc3269edab4043b%intersectionIntersection%dfc3269edab4043b%intersection_control",
                    "selected": False
                },
                {
                    "source": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group",
                    "sourceHandle": "649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output",
                    "target": "Intersection%dfc3269edab4043b%intersection",
                    "targetHandle": "Intersection%dfc3269edab4043b%intersection_source",
                    "id": "reactflow__edge-649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group649723173d4cc5b5de6b3c1d%bdfe59746d2c07f2%group_output-Intersection%dfc3269edab4043b%intersectionIntersection%dfc3269edab4043b%intersection_source",
                    "selected": False
                },
                {
                    "source": "649b3cfb96c2d01a5fd1c6b4%de304d22a881524f%group",
                    "sourceHandle": "649b3cfb96c2d01a5fd1c6b4%de304d22a881524f%group_output",
                    "target": "649b3d5437d8522daa9ca1f2%8a7a224fd3e367e1%teleoscope",
                    "targetHandle": "649b3d5437d8522daa9ca1f2%8a7a224fd3e367e1%teleoscope_source",
                    "id": "reactflow__edge-649b3cfb96c2d01a5fd1c6b4%de304d22a881524f%group649b3cfb96c2d01a5fd1c6b4%de304d22a881524f%group_output-649b3d5437d8522daa9ca1f2%8a7a224fd3e367e1%teleoscope649b3d5437d8522daa9ca1f2%8a7a224fd3e367e1%teleoscope_source",
                    "selected": False
                },
                {
                    "source": "649b3f0b96c2d01a5fd1c6c8%3c25861d068e8859%group",
                    "sourceHandle": "649b3f0b96c2d01a5fd1c6c8%3c25861d068e8859%group_output",
                    "target": "646403260eac97d6f003a766%929d02cbb6986a8d%teleoscope",
                    "targetHandle": "646403260eac97d6f003a766%929d02cbb6986a8d%teleoscope_control",
                    "id": "reactflow__edge-649b3f0b96c2d01a5fd1c6c8%3c25861d068e8859%group649b3f0b96c2d01a5fd1c6c8%3c25861d068e8859%group_output-646403260eac97d6f003a766%929d02cbb6986a8d%teleoscope646403260eac97d6f003a766%929d02cbb6986a8d%teleoscope_control",
                    "selected": False
                },
                {
                    "source": "649b99d237d8522daa9ca26f%77af6272b27680c5%group",
                    "sourceHandle": "649b99d237d8522daa9ca26f%77af6272b27680c5%group_output",
                    "target": "649b99ae96c2d01a5fd1c740%5451102e21f2cf35%teleoscope",
                    "targetHandle": "649b99ae96c2d01a5fd1c740%5451102e21f2cf35%teleoscope_control",
                    "id": "reactflow__edge-649b99d237d8522daa9ca26f%77af6272b27680c5%group649b99d237d8522daa9ca26f%77af6272b27680c5%group_output-649b99ae96c2d01a5fd1c740%5451102e21f2cf35%teleoscope649b99ae96c2d01a5fd1c740%5451102e21f2cf35%teleoscope_control",
                    "selected": False
                },
                {
                    "source": "637eabe7f0a9482a337a11d5%f323aa5c110973a5%document",
                    "sourceHandle": "637eabe7f0a9482a337a11d5%f323aa5c110973a5%document",
                    "target": "649c4a5fb60009cf233b7d20%561be49f851ac0dd%teleoscope",
                    "targetHandle": "649c4a5fb60009cf233b7d20%561be49f851ac0dd%teleoscope",
                    "id": "reactflow__edge-637eabe7f0a9482a337a11d5%f323aa5c110973a5%document637eabe7f0a9482a337a11d5%f323aa5c110973a5%document-649c4a5fb60009cf233b7d20%561be49f851ac0dd%teleoscope649c4a5fb60009cf233b7d20%561be49f851ac0dd%teleoscope",
                    "selected": False
                },
                {
                    "source": "649c4a50b79396de653e93bd%51214ac7fb2d1bab%group",
                    "sourceHandle": "649c4a50b79396de653e93bd%51214ac7fb2d1bab%group_output",
                    "target": "649c4e4841bdc46071c1e0cf%6d0d72a56b097620%teleoscope",
                    "targetHandle": "649c4e4841bdc46071c1e0cf%6d0d72a56b097620%teleoscope_control",
                    "id": "reactflow__edge-649c4a50b79396de653e93bd%51214ac7fb2d1bab%group649c4a50b79396de653e93bd%51214ac7fb2d1bab%group_output-649c4e4841bdc46071c1e0cf%6d0d72a56b097620%teleoscope649c4e4841bdc46071c1e0cf%6d0d72a56b097620%teleoscope_control"
                },
                {
                    "source": "637f2e3d460aea988a461bc8%1077ac2a76966f85%document",
                    "sourceHandle": "637f2e3d460aea988a461bc8%1077ac2a76966f85%document_output",
                    "target": "649c52471b5e10f2a185c577%f5b9ea699071d8c5%teleoscope",
                    "targetHandle": "649c52471b5e10f2a185c577%f5b9ea699071d8c5%teleoscope_control",
                    "id": "reactflow__edge-637f2e3d460aea988a461bc8%1077ac2a76966f85%document637f2e3d460aea988a461bc8%1077ac2a76966f85%document_output-649c52471b5e10f2a185c577%f5b9ea699071d8c5%teleoscope649c52471b5e10f2a185c577%f5b9ea699071d8c5%teleoscope_control"
                },
                {
                    "source": "649c95a518a407264b76e65f%a813324af17be2eb%group",
                    "sourceHandle": "649c95a518a407264b76e65f%a813324af17be2eb%group_output",
                    "target": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
                    "targetHandle": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope_source",
                    "id": "reactflow__edge-649c95a518a407264b76e65f%a813324af17be2eb%group649c95a518a407264b76e65f%a813324af17be2eb%group_output-649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope_source"
                }
            ],
            "bookmarks": [
                "637f5f318881e51b8d886696"
            ],
            "logical_clock": 82,
            "label": "default",
            "selection": {
                "nodes": [
                    {
                        "width": 200,
                        "height": 34,
                        "id": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
                        "type": "Teleoscope",
                        "position": {
                            "x": 111,
                            "y": 100
                        },
                        "positionAbsolute": {
                            "x": 111,
                            "y": 100
                        },
                        "style": {
                            "width": 200,
                            "height": 34
                        },
                        "data": {
                            "label": "649c95aa18a407264b76e662%4b672ff00e0078be%teleoscope",
                            "oid": "649c95aa18a407264b76e662",
                            "type": "Teleoscope",
                            "uid": "4b672ff00e0078be"
                        },
                        "selected": True
                    }
                ],
                "edges": []
            },
            "settings": {
                "default_document_width": 200,
                "default_document_height": 34,
                "defaultExpanded": True,
                "color": "#f44e3b"
            },
            "windows": []
        }
    },
    "userid": "637ee569d1259b1565f7e97e",
    "db": "aita"
}