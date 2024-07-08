import { ObjectId } from "mongodb";

export interface Workflows {
  _id?: ObjectId;
  workspace: ObjectId;
  label: string;
  nodes: Array<any>;
  edges: Array<any>;
  bookmarks: Array<ObjectId>;
  selection: Selection;
  settings: Settings;
}

interface Selection {
  nodes: any;
  edges: any;
}


interface Settings {
  color: string;
  title_length: number;
}

