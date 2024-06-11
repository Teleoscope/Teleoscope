import { ObjectId } from "mongodb";

export interface Workspaces {
  _id?: ObjectId;
  label: string;
  team: ObjectId;
  workflows?: Array<ObjectId>;
}

