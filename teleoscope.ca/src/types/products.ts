import { ObjectId } from "mongodb";

export interface Products {
  name: string;
  stripe_id?: string;
  resources: Resources;
}

interface Resources {
  teams: number;
  seats: number;
  storage: number;
}

