import { ObjectId } from "mongodb";

export interface Files {
  _id?: ObjectId;
  workspace: ObjectId;
  user: string;
  filename: string;
  status: Status;
}

export interface Status {
  message: string;
  ready: boolean;
}

