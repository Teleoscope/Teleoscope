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

export interface Selection {
  nodes: any;
  edges: any;
}


export interface Settings {
  color: string;
  title_length: number;
}

