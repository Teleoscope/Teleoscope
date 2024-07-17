import { ObjectId } from "mongodb";

export interface Workflows {
  _id?: any;
  last_update: any;
  logical_clock: number;
  workspace: any;
  label: string;
  nodes: Array<any>;
  edges: Array<any>;
  bookmarks: Array<any>;
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

