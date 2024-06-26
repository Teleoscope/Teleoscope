import { ObjectId } from "mongodb";

export interface Users {
  _id: string;
  emails: Array<string>;
  hashed_password: string;
  first_name?: string;
  last_name?: string;
}

