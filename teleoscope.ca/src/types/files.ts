import { ObjectId } from "mongodb";

export interface Files {
  _id?: ObjectId;
  filename: string;
  status: Status;
}

export interface Status {
  message: string;
  ready: boolean;
}

