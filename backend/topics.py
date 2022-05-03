'''
Requirements for topics API:

Topic definition:
- A topic is a collection of documents defined by the user

Topic functionality:
- Create topic: user creates a topic and gives it a name and 1 or more initial documents
- Add to topic: user adds a document to an existing topic
- Remove from topic: user removes a document from an existing topic
- Delete topic: user deletes a topic
- Merge topics: user merges two topics?
- Recommend documents: user gets a list of documents that are most similar to a given topic
- Overlapping documents: user gets a list of documents that occur in both topics

Documents & Topic Relationships:
- a document can be in multiple topics
- a topic can have multiple documents

Create Topic:
- Input: topic name, list of documents
- Side effects: create topic in mongo, remove duplicates from list of documents, add documents to topic

Add to Topic::
- Input: topic name, document id
- Side effects: add document id to topic document set

Remove from Topic:
- Input: topic name, document id
- Side effects: remove document id from topic document set

Delete Topic:
- Input: topic name
- Side effects: delete topic from mongo

Merge Topics:
- Input: merged topic name, topic name, topic name
- Side effects: create new topic which does a mongodb set union of both topics' docs, delete both topics.

Recommend Documents:
- Input: topic name
- Side effects: get list of documents that are most similar to topic and are not already in topic

Overlapping Documents:
- Input: topic name, topic name
- Side effects: get list of documents that occur in both topics

'''

from utils import connect

class topicAPI:

    def __init__(self) -> None:
        self.db = connect()

    def create_topic(self, topic_name, documents):
        topic_document_set = set(documents)
        self.db.topics.insert_one({
            "name": topic_name,
            "documents": topic_document_set
        })
        return
    
    def add_to_topic(self, topic_name, document):
        self.db.topics.update_one(
            {"name": topic_name},
            {"$addToSet": {"documents": document}}
        )
        return

    def remove_from_topic(self, topic_name, document):
        self.db.topics.update_one(
            {"name": topic_name},
            {"$pull": {"documents": document}}
        )
        return
    
    def delete_topic(self, topic_name):
        self.db.topics.delete_one({"name": topic_name})
        return

    def merge_topics(self, merged_topic_name, topic_name_1, topic_name_2):
        topic_1 = self.db.topics.find_one({"name": topic_name_1})
        topic_2 = self.db.topics.find_one({"name": topic_name_2})
        merged_topic_documents = topic_1["documents"] | topic_2["documents"]
        self.db.topics.insert_one({
            "name": merged_topic_name,
            "documents": merged_topic_documents
        })
        self.db.topics.delete_one({"name": topic_name_1})
        self.db.topics.delete_one({"name": topic_name_2})
        return

    def overlapping_documents(self, topic_name_1, topic_name_2):
        topic_1 = self.db.topics.find_one({"name": topic_name_1})
        topic_2 = self.db.topics.find_one({"name": topic_name_2})
        topic_1_documents = set(topic_1["documents"])
        topic_2_documents = set(topic_2["documents"])
        return topic_1_documents & topic_2_documents

    def recommend_documents(self, topic_name):
        topic = self.db.topics.find_one({"name": topic_name})
        topic_documents = set(topic["documents"])
        similar_documents = None # do some NLP magic here
        return similar_documents