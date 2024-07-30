import { ObjectId } from "mongodb";

export interface Groups {
  color: string;
  docs: Array<ObjectId>;
  label: string;
  description?: string;
  workspace: any;
}

