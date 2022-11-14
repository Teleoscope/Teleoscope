// used to omit the password hash property from
// users returned by the api

export { omit };

function omit(obj, key) {
   const { [key]: omitted, ...rest } = obj;
  return rest;
}
