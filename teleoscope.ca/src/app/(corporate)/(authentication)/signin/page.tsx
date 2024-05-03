import { UserAuthForm } from "@/components/Authentication";
import { redirect } from "next/navigation";
import { validateEmail, validatePassword, ActionResult, errors } from "@/lib/validate";
import { mdb } from "@/lib/db";
import { verify } from "@node-rs/argon2";

import { authenticate } from "@/lib/auth";


export default function SignIn() {
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold">Sign In</h1>
      </div>
        <UserAuthForm onLogin={signin} buttonText="Sign In with Email" />
    </main>
  );
}

async function signin(formData: FormData): Promise<ActionResult> {
  "use server";
  const email = formData.get("email");
  const password = formData.get("password");

  if (!password || !email) {
    return errors.missing
	}
	if (!validateEmail(email)) {
		return errors.email
	}
	if (!validatePassword(password)) {
		return errors.password
	}

  const db = await mdb()
  const existingUser = await db.collection("users").findOne({emails: [email]})
	if (!existingUser) {
		// NOTE:
		// Returning immediately allows malicious actors to figure out valid usernames from response times,
		// allowing them to only focus on guessing passwords in brute-force attacks.
		// As a preventive measure, you may want to hash passwords even for invalid usernames.
		// However, valid usernames can be already be revealed with the signup page among other methods.
		// It will also be much more resource intensive.
		// Since protecting against this is non-trivial,
		// it is crucial your implementation is protected against brute-force attacks with login throttling etc.
		// If usernames are public, you may outright tell the user that the username is invalid.
		return errors.incorrect
	}

	const validPassword = await verify(existingUser.hashed_password, password.toString(), {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
  
	if (!validPassword) {
		return errors.incorrect
	}
  
	const session = await authenticate(existingUser.id)
  

  return redirect("/dashboard");
}