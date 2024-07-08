import { ObjectId } from "mongodb";

export interface Workspaces {
  _id?: ObjectId;
  label: string;
  team: ObjectId;
  settings?: Settings;
  notes?: Array<ObjectId>;
  workflows?: Array<ObjectId>;
}

interface Settings {
  document_width: number;
  document_height: number;
  expanded: boolean;
}

