'use client'
import Menu from "@/components/CorporateMenu";
import Link from "next/link"

import { useState } from "react";
import { Button } from "@/components/ui/button"

export default function Home() {
  /* State logic for modular header*/
  const [activeHeaderSection, setActiveHeaderSection] = useState<string | null>(null);

  const toggleHeaderSection = (sectionId: string) => {
    setActiveHeaderSection(sectionId === activeHeaderSection ? null : sectionId )
  }

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

        <div className="px-4 pt-24 pb-12">
          <h1 className="flex items-center justify-center text-3xl font-bold">What is Teleoscope?</h1>
          <h2 className="flex items-center justify-center text-xl">Use machine learning to accelerate your research and develop intelligent insights.</h2>
        </div>

        <div className="grid grid-cols-4 gap-8 px-4 pb-24">
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('discover')} variant={`${activeHeaderSection === 'discover' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Discover</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('research')} variant={`${activeHeaderSection === 'research' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Research</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('organize')} variant={`${activeHeaderSection === 'organize' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Organize</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('collaborate')} variant={`${activeHeaderSection === 'collaborate' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-12">Collaborate</h1>
            </Button>
          </div>
        </div>

        {/* Modular Header Sections */}
        <div id="discover" className={`flex p-8 ${activeHeaderSection === 'discover' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Discover</h1>
              <ul className="px-16 py-4">
                <li>
                  <h3  className="text-lg font-bold">Effortless Navigation</h3>
                  <p>Built around its whiteboard interface, Teleoscope’s interface allows you to navigate your data without rows and columns. Using its intuitive drop-down menus and accessible workflows, you gain the full depth of a research tool while spending less time searching for features, letting you focus on your data and analysis.</p>
                </li>
                <li>
                  <h3  className="text-lg font-bold">Traceable Results</h3>
                  <p>Understanding the origins of your conclusions and being able to cite them is a key part of research. Teleoscope’s traceable workflows display exactly which data entries influenced the insights it generated, providing researchers a clear understanding of each result’s provenance.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="research" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'research' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Research</h1>
              <ul className="px-16 py-4">
                <li>
                  <h3  className="text-lg font-bold">Customized AI</h3>
                  <p>Teleoscope is designed to be used by researchers and analysts working on all kinds of research projects. Teleoscope allows you to customize its machine learning model to work best for you and your team. Using its dynamic workflows, you can quickly tailor its AI model to match and filter through your data.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="organize" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'organize' ? '' : 'hidden'}`}>
          <h1 className="text-4xl px-16">Organize</h1>
        </div>

        <div id="collaborate" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'collaborate' ? '' : 'hidden'}`}>
          <h1 className="text-4xl px-16">Collaborate</h1>
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
