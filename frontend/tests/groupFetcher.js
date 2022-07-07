// This implements a module that fetches the group data from our [group] API and returns all the group fields
import request from './request';

// we expect the request.js module to return a promise, we can chain a call to then
// to receive a group
export function getGroup(groupID) {
   return request(`/pages/api/groups/${groupID}`).then(group => group);
} 