import Menu from "@/components/CorporateMenu";
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function Home() {

  return (
    <main>
      <div>
        <Menu></Menu>
        
        <div className="flex items-center justify-center p-4">
          <h1 className="text-3xl font-bold">Empower your research and discover more with Teleoscope.</h1>
        </div>

        <div className="flex items-center justify-center p-2">
          <Button variant="default">
            <Link href="/signup" legacyBehavior passHref>
              <h1 className="text-lg">Discover Teleoscope</h1>
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8 px-4 py-24">
          <div className="flex items-center justify-center">
            <Button variant="home" size="home">
              <h1 className="text-4xl px-24">Discover</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button variant="home" size="home">
              <h1 className="text-4xl px-24">Research</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button variant="home" size="home">
              <h1 className="text-4xl px-24">Organize</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button variant="home" size="home">
              <h1 className="text-4xl px-20">Collaborate</h1>
            </Button>
          </div>
        </div>

        <div className="p-4">
          <h1 className="flex items-center justify-center text-3xl font-bold">What is Teleoscope?</h1>
          <h2 className="flex items-center justify-center text-xl">Use machine learning to accelerate your research and develop intelligent insights.</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 bg-blue-500">
          <div className="text-white text-xl p-16">
            Ready to see Teleoscope first hand? Schedule a demo with our team and discover how Teleoscope can empower your team.
          </div>
          <div className="flex items-center justify-center p-4">
            <Button variant="secondary">
              <Link href="/product-demonstrations" legacyBehavior passHref>
                <h1 className="text-lg">Book a demo</h1>
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center p-8">
          <h1 className="text-3xl font-bold">Get started with Teleoscope</h1>
        </div>

      <div className="flex items-center justify-center px-24 py-8">
        <div className="grid grid-cols-2 gap-8 rounded bg-gray-200">
          <div className="flex items-center justify-center text-xl p-4">
              Find the plan that is right for you
            </div>
            <div className="flex items-center justify-center p-4">
              <Button variant="teleoscopeBlue">
                <Link href="/pricing" legacyBehavior passHref>
                  <h2 className="text-lg">Find Pricing</h2>
                </Link>
              </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-2">
        <div className="grid grid-cols-3 gap-4 rounded bg-gray-200">
          <div className="flex items-center justify-center text-xl p-4">
            Stay up to date with the latest developments in research and join our community with our newsletter.
          </div>
          <div className="p-8">
          </div>
          <div className="flex items-center justify-center p-4">
            <Button variant="teleoscopeBlue">
              <Link href="/signup" legacyBehavior passHref>
                <h2 className="text-lg">Sign Up</h2>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      </div>
    </main>
  );
}
