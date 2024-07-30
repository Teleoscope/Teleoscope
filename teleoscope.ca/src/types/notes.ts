import { ObjectId } from "mongodb";

export interface Notes {
  _id?: ObjectId;
  label: string;
  content?: any;
  text?: string;
  workspace?: any;
}

