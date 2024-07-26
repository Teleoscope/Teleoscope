import { ObjectId } from "mongodb";

export interface Teams {
  _id?: ObjectId;
  label: string;
  owner: string;
  account: ObjectId;
  workspaces: Array<ObjectId>;
  users: Array<User>;
}

export interface User {
  _id: string;
  permissions: Permissions;
}

export interface Permissions {
  read: boolean;
  write?: boolean;
}

