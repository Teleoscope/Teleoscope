import { ObjectId } from "mongodb";

export interface Notes {
  _id?: ObjectId;
  label: string;
}

