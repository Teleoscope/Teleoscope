import { ObjectId } from "mongodb";

export interface Accounts {
  _id: ObjectId;
  stripe_id?: string;
  users: Users;
  resources: Resources;
  teams?: Array<Team>;
  data?: Array<ObjectId>;
  plan: Plan;
  purchases?: Array<Purchase>;
}

interface Users {
  owner: string;
  admins?: Array<Admin>;
}

interface Admin {
  _id: string;
  permissions: ObjectId;
}


interface Resources {
  amount_teams_available: number;
  amount_seats_available: number;
  amount_storage_available: number;
  amount_teams_used: number;
  amount_seats_used: number;
  amount_storage_used: number;
}


interface Team {
  _id: ObjectId;
}


interface Plan {
  name: string;
  plan_team_amount: number;
  plan_collaborator_amount: number;
  plan_storage_amount: number;
  note: string;
}


interface Purchase {
  resource: string;
  unit: string;
  amount: number;
  recurrence: string;
  date: Date;
  description: string;
  metadata: any;
}

