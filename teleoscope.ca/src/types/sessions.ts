import { ObjectId } from "mongodb";

export interface Sessions {
  _id: string;
  user_id: string;
  expires_at: Date;
  fresh?: boolean;
}

