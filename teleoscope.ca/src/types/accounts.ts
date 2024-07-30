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

export interface Users {
  owner: string;
  admins?: Array<Admin>;
}

export interface Admin {
  _id: string;
  permissions: ObjectId;
}


export interface Resources {
  amount_teams_available: number;
  amount_seats_available: number;
  amount_storage_available: number;
  amount_teams_used: number;
  amount_seats_used: number;
  amount_storage_used: number;
}


export interface Team {
  _id: ObjectId;
}


export interface Plan {
  name: string;
  plan_team_amount: number;
  plan_collaborator_amount: number;
  plan_storage_amount: number;
  note: string;
}


export interface Purchase {
  resource: string;
  unit: string;
  amount: number;
  recurrence: string;
  date: Date;
  description: string;
  metadata: any;
}

