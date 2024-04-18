import { UserAuthForm } from "@/components/Authentication";

export default function SignIn() {
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold">Sign In</h1>
      </div>
        <UserAuthForm />
    </main>
  );
}
