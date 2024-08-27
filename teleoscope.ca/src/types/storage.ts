import { ObjectId } from "mongodb";

export interface Storage {
  label: string;
  size?: number;
  docs?: Array<any>;
}

