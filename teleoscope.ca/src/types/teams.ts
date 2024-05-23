import { ObjectId } from "mongodb";

export interface Teams {
  _id: ObjectId;
  account: ObjectId;
  workspaces: Array<ObjectId>;
  users: Array<User>;
}

interface User {
  _id: string;
  permissions: Permissions;
}

interface Permissions {
  read: boolean;
  write?: boolean;
}

