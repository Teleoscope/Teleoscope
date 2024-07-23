import { ObjectId } from "mongodb";

export interface Workspaces {
  _id?: any;
  label: string;
  team: any;
  settings?: Settings;
  notes?: Array<any>;
  selected_workflow?: any;
  workflows?: Array<any>;
}

interface Settings {
  document_width: number;
  document_height: number;
  expanded: boolean;
}

