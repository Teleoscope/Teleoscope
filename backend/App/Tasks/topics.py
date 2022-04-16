'''
TODO:
- Move the functions below into tasks.py or add app.task decorator in this file.
- Adding app.task decorator will mean that we have 2 files registering tasks: this one, and tasks.py.
'''

from utils import connect

class topicAPI:

    def __init__(self) -> None:
        self.db = connect()

    '''
    Create Topic:
    - Input: topic name, list of documents
    - Side effects: create topic in mongo, remove duplicates from list of documents, add documents to topic
    '''
    def create_topic(self, topic_name, documents):
        topic_document_set = set(documents)
        self.db.topics.insert_one({
            "name": topic_name,
            "documents": topic_document_set
        })
        return
    
    '''
    Add to Topic::
    - Input: topic name, document id
    - Side effects: add document id to topic document set
    '''
    def add_to_topic(self, topic_name, document):
        self.db.topics.update_one(
            {"name": topic_name},
            {"$addToSet": {"documents": document}}
        )
        return

    '''
    Remove from Topic:
    - Input: topic name, document id
    - Side effects: remove document id from topic document set
    '''
    def remove_from_topic(self, topic_name, document):
        self.db.topics.update_one(
            {"name": topic_name},
            {"$pull": {"documents": document}}
        )
        return

    '''
    Delete Topic:
    - Input: topic name
    - Side effects: delete topic from mongo
    '''
    def delete_topic(self, topic_name):
        self.db.topics.delete_one({"name": topic_name})
        return


    '''
    Merge Topics:
    - Input: merged topic name, topic name, topic name
    - Side effects: create new topic which does a mongodb set union of both topics' docs, delete both topics.
    '''
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

    '''
    Recommend Documents:
    - Input: topic name
    - Side effects: get list of documents that are most similar to topic and are not already in topic
    '''
    def overlapping_documents(self, topic_name_1, topic_name_2):
        topic_1 = self.db.topics.find_one({"name": topic_name_1})
        topic_2 = self.db.topics.find_one({"name": topic_name_2})
        topic_1_documents = set(topic_1["documents"])
        topic_2_documents = set(topic_2["documents"])
        return topic_1_documents & topic_2_documents

    '''
    Overlapping Documents:
    - Input: topic name, topic name
    - Side effects: get list of documents that occur in both topics
    '''
    def recommend_documents(self, topic_name):
        topic = self.db.topics.find_one({"name": topic_name})
        topic_documents = set(topic["documents"])
        similar_documents = None # do some NLP magic here
        return similar_documents