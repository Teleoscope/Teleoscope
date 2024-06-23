import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// TODO: Add server action to subscribe to newsletter
export default function NewsletterSection() {
  return (
    <div className="flex items-center justify-between w-full  p-10 border-y ">
        <div className="flex flex-col  gap-2 w-full  py-2">
          <span className="text-lg font-bold">Stay in the loop</span>
          <span className="max-w-sm text-sm ">
            Stay up to date with the latest developments in research and join
            our community with our newsletter.
          </span>
        </div>
        <form className="flex items-center justify-end py-4 gap-2">
          <Input type="email" id="email" placeholder="Jane@doe.com" className="w-60 bg-neutral-50 min-w-fit" />
          <Button className=" bg-black text-white hover:text-white hover:shadow-xl hover:bg-black">Subscribe</Button>
        </form>
    </div>
  );
}
