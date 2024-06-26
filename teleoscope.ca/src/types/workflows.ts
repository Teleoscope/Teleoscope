import { ObjectId } from "mongodb";

export interface Workflows {
  workspace: ObjectId;
  label: string;
  nodes: Array<Node>;
  edges: Array<any>;
  bookmarks: Array<ObjectId>;
  selection: Selection;
  settings: Settings;
}

interface Node {
  id: string;
  position: Position;
  data: any;
}

interface Position {
  x: number;
  y: number;
}


interface Selection {
  nodes: Array<string>;
  edges: Array<string>;
}


interface Settings {
  color: string;
  title_length: number;
}

