import { ObjectId } from "mongodb";

export interface Documents {
  text: string;
  title: string;
  vector?: string;
  relationships: any;
  metadata: any;
  state: any;
}

