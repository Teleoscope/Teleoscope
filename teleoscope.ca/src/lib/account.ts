import { mdb } from "@/lib/db";
import { MongoError } from "mongodb";
import { errors } from "@/lib/validate";

export default async function initialize_user(userId: string, hashedPassword: string, email: FormDataEntryValue) {
  try {
    const db = await mdb()
    // Attempt to insert a new user
    
    const user_result = await db.collection("users").insertOne({
      // @ts-ignore
      _id: userId,
      emails: [email],
      hashed_password: hashedPassword
    });
  
    await db.collection("accounts").insertOne({
      users: {
        owner: user_result.insertedId
      },
      resources: {
        // Default account
        amount_teams: 1, // one team
        amount_tokens: 100000, // 100,000 tokens / mo
        amount_seats: 2, // two collaborators
        amount_storage: 500 // Gb
      }
    });
    
  } catch (error) {
    try { 
      const mongoError = error as MongoError;
      if (mongoError.code === 11000) {
        return errors.exists;
      }
    } catch (e) {
      throw e  
    }
    throw error
  }
}