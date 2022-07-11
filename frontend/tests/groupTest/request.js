const groups = [{
   _id: "62bcf9d935ecd3b837093c78",
   color: "#8c564b",
   label: "mockLabel",
   history: [{
      included_posts: [],
      label: "mockLabel"
   }]
}];

// a promise is the eventual completion or failure of an async operation,
// which is good for the mock api call which is an async function
export default function request(url) {
   return new Promise((resolve, reject) => {
    console.log(url.substr(`/pages/api/groups/`.length));1
     const group = parseInt(url.substr(`/pages/api/groups/`.length), 10);
     process.nextTick(() =>
       groups[group]
         ? resolve(groups[group])
         : reject({
             error: `Group with ${group} not found.`,
           }),
     );
   });
 }