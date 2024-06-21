import Link from "next/link";
import { Button } from "../ui/button";

export default function DemoCTA() {
  return (
    <div className="flex justify-center items-center w-full gap-8 p-10  ">
      <div className="flex flex-col gap-8 bg-pink-50 max-w-4xl rounded-xl w-full p-10 px-20">
        <div className="text-xl ">
          <p>
            Ready to see Teleoscope first hand? Schedule a demo with our team
            and discover how Teleoscope can empower your team.
          </p>
        </div>
        <div className="flex items-center justify-center p-4">
          <Button variant="secondary">
            <Link href="/signup" legacyBehavior passHref>
              <h1 className="text-lg">Book a demo</h1>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
