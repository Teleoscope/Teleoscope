import clustering
from bson.objectid import ObjectId
import logging

user_id = ["63868b5fb3cde877de34c27d"] # user: leo	
group_id_str = ["640aa2cd939c16d2a6ee7b1e"]
sess_id = ObjectId(str("63c730d0cb1ea260cc35923b")) # session: miniature

clustering.cluster_by_groups(
	userid=user_id, 
	group_id_strings=group_id_str, 
	session_oid=sess_id,
)