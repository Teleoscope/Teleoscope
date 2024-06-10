import { client } from '@/lib/db';
import { ensure_db_collections_exist } from '@/lib/db';
import { get_stripe } from '@/lib/stripe';
import { Plans } from '@/lib/plans';

export default async function initialize_user(
    userId: string,
    hashedPassword: string,
    email: FormDataEntryValue
) {

    const mongo_client = await client()
    const session = mongo_client.startSession();
    const db = mongo_client.db();
    const stripe = await get_stripe();

    // Ensure db collections exist with current validation rules
    // only run in dev or debug, otherwise the dbs should exist
    if (process.env.NODE_ENV === 'development') {
        // Code to run in development mode
        await ensure_db_collections_exist(db);
    }

    session.startTransaction();

    // Attempt to insert a new user
    const user_result = await db.collection('users').insertOne({
        // @ts-ignore
        _id: userId,
        emails: [email],
        hashed_password: hashedPassword
    }, { session });

    const default_plan = Plans.find(plan => plan.name == "Default");
    if (!default_plan) {
        throw new Error(`No Default plan available.`)
    }

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
            amount_teams_available: 1, // teams
            amount_seats_available: 1, // seats
            amount_storage_available: 100, // megabytes
            amount_teams_used: 1, // teams
            amount_seats_used: 1, // seats
            amount_storage_used: 0 // megabytes
        }, //
        plan: {
            //
            name: default_plan.name, //
            plan_team_amount: default_plan.resources.teams, // teams
            plan_collaborator_amount: default_plan.resources.seats, // seats
            plan_storage_amount: default_plan.resources.storage, // megabytes
            note: 'The default plan for every newly signed-up user.'
        }
    };

    const mongo_insert_result = await db
        .collection('accounts')
        .insertOne(account_doc, { session });

    if (mongo_insert_result) {
        const customer = await stripe.customers.search({
            query: `metadata["userId"]:"${userId}"`
        });

        if (customer.data.length == 0) {
            const new_customer = await stripe.customers.create({
                email: email.toString(),
                metadata: {
                    userId: userId
                }
            });

            const default_subscriptions = await stripe.products.search({
                query: `name:"Default"`
            })

            if (default_subscriptions.data.length > 0) {
                const default_subscription = default_subscriptions.data[0]

                if (default_subscription) {
                    const new_subscription = await stripe.subscriptions.create({
                        customer: new_customer.id,
                        items: [
                            {
                                price: default_subscription.default_price?.toString()
                            }
                        ]
                    })
                    if (!new_subscription) {
                        throw new Error("Didn't create a default subscription.")
                    }
                } else {
                    throw new Error("Default subscription not retrieved.")
                }
            } else {
                throw new Error("Default subscription not defined.")
            }


            if (new_customer) {
                const mongo_update_result = await db
                    .collection('accounts')
                    .updateOne(
                        {
                            _id: mongo_insert_result.insertedId
                        },
                        {
                            $set: {
                                stripe_id: new_customer.id
                            }
                        },
                        { session }
                    );
                
                if (mongo_update_result) {
                  await session.commitTransaction();
                  console.log("Transaction committed. New user and customer created.");
                }
            } else {
                throw new Error("Didn't create a new customer.")
            }
        } else {
            throw new Error("Customer already exists in Stripe.")
        }
    }
}
