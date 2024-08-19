import { ObjectId, Timestamp, Long, Decimal128 } from 'bson';

export const convertBsonToJsObject = (data: any): any => {
  if (data instanceof ObjectId) {
    return data.toString();
  }
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (data instanceof Timestamp) {
    return data.toString();
  }
  if (data instanceof Long) {
    return data.toString();
  }
  if (data instanceof Decimal128) {
    return data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertBsonToJsObject(item));
  }
  if (data && typeof data === 'object') {
    const result: { [key: string]: any } = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = convertBsonToJsObject(data[key]);
      }
    }
    return result;
  }
  return data;
};