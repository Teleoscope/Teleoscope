import { client } from "@/lib/db";
import { ensure_db_collections_exist } from "@/lib/db";

export default async function initialize_user(userId: string, hashedPassword: string, email: FormDataEntryValue) {

    const db = (await client()).db()

    // Ensure db collections exist with current validation rules
    // only run in dev or debug, otherwise the dbs should exist
    if (process.env.NODE_ENV === 'development') {
      // Code to run in development mode
      await ensure_db_collections_exist(db)
    }
  
    // Attempt to insert a new user  
    const user_result = await db.collection("users").insertOne({
      // @ts-ignore
      _id: userId,
      emails: [email],
      hashed_password: hashedPassword
    });

    const account_doc = {
      users: {
        owner: userId
      },
      resources: {
        // ==============================||===========
        // Default account               ||
        // ==============================||===========
        // Resource                      || Unit
        // ------------------------------||-----------
        amount_teams_available: 1,       // teams
        amount_tokens_available: 100000, // tokens
        amount_seats_available: 2,       // seats
        amount_storage_available: 500,   // megabytes
        amount_teams_used: 1,            // teams
        amount_tokens_used: 0,           // tokens
        amount_seats_used: 1,            // seats
        amount_storage_used: 0,           // megabytes
      },                                 //
      plan: {                            //
        name: "Default",                 //
        plan_token_topup: 100000,        // tokens
        plan_team_amount: 1,             // teams
        plan_collaborator_amount: 2,     // seats
        plan_storage_amount: 500,        // megabytes
        note: "The default plan for every newly signed-up user.",
      }
    }
  
    await db.collection("accounts").insertOne(account_doc);
}