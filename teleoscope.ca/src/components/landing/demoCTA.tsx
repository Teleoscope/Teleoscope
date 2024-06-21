import Link from "next/link";
import { Button } from "../ui/button";

export default function DemoCTA() {

    return (

        <div className="grid grid-cols-2 gap-8 bg-blue-500">
          <div className="text-white text-xl p-16">
            Ready to see Teleoscope first hand? Schedule a demo with our team and discover how Teleoscope can empower your team.
          </div>
          <div className="flex items-center justify-center p-4">
            <Button variant="secondary">
              <Link href="/signup" legacyBehavior passHref>
                <h1 className="text-lg">Book a demo</h1>
              </Link>
            </Button>
          </div>
        </div>
    )

}