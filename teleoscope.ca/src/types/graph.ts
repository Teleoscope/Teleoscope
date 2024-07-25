import { ObjectId } from "mongodb";

export interface Graph {
  uid: string;
  type: string;
  workflow: ObjectId;
  workspace?: ObjectId;
  status: string;
  reference?: any;
  doclists: Array<Doclist>;
  parameters: any;
  edges: Edges;
}

interface Doclist {
  uid: any;
  reference: any;
  type: string;
  ranked_documents: any;
}


interface Edges {
  source: any;
  control: any;
  output: any;
}

