import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountSettings() {
  return (
    <div className="flex flex-col gap-10 p-10 ">
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Account Settings</h2>
        <p>Update your account information.</p>

        <section className="flex flex-col gap-4 py-4">
          <h3 className="text-lg font-semibold">Profile</h3>
          <section className="flex flex-col gap-4 py-4">
            <Label>Name</Label>
            <Input placeholder="John Doe" />
          </section>
          <section className="flex flex-col gap-4 py-4">
            <h3 className="text-lg font-semibold">Security</h3>
            <section className="flex items-center gap-4 py-4">
              <Label>Password</Label>
              <Button variant={"outline"} className=" w-fit">Change Password</Button>
            </section>
          </section>
        </section>
      </section>
    </div>
  );
}
