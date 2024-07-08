import { UserAuthForm } from "@/components/Authentication";
import { signin, validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignIn() {
    
  const { user } = await validateRequest();
	if (user) {
		return redirect("/dashboard");
	}
  
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold">Sign In</h1>
      </div>
        <UserAuthForm onLogin={signin} buttonText="Sign In with Email" />
    </main>
  );
}