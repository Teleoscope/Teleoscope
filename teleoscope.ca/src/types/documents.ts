import { ObjectId } from "mongodb";

export interface Documents {
  text: string;
  title: string;
  relationships: any;
  metadata: any;
  workspace: ObjectId;
  state: any;
}

