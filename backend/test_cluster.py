import clustering
from bson.objectid import ObjectId
import logging

user_id = ObjectId(str('63868b5fb3cde877de34c27d')) # user: leo	
group_id_str = ['63901a89e189962b660959cf', '63901a92931eeac91c9924a1', '63901a96e189962b660959d3']
sess_id = ObjectId(str('63f68cfba7e87c4253864452')) # session: miniature

clustering.cluster_by_groups(
	userid=user_id, 
	group_id_strings=group_id_str, 
	session_oid=sess_id,
)