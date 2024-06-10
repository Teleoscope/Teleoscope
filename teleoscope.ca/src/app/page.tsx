'use client'
import Menu from "@/components/CorporateMenu";
import Link from "next/link"

import { useState } from "react";
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"


export default function Home() {
  /* State logic for modular headers */
  const [activeHeaderSection, setActiveHeaderSection] = useState<string | null>("discover");

  const toggleHeaderSection = (sectionId: string) => {
    setActiveHeaderSection(sectionId === activeHeaderSection ? null : sectionId )
  }

  /* Form building components for email subscriptions to our newsletter */
  const formSchema = z.object({
    username: z.string().min(2).max(50),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "youremail@example.com",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
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

        <div className="grid grid-cols-4 gap-8 px-4 pb-8">
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('discover')} variant={`${activeHeaderSection === 'discover' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Discover</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('organize')} variant={`${activeHeaderSection === 'organize' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Organize</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('analyze')} variant={`${activeHeaderSection === 'analyze' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-16">Analyze</h1>
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button onClick={() => toggleHeaderSection('collaborate')} variant={`${activeHeaderSection === 'collaborate' ? 'teleoscopeBlue' : 'home'}`} size="home">
              <h1 className="text-4xl px-12">Collaborate</h1>
            </Button>
          </div>
        </div>

        {/* Modular Header Sections */}
        <div id="discover" className={`flex items-center jusitfy-center p-8 ${activeHeaderSection === 'discover' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Discover</h1>
              <ul className="px-16 py-4">
                <li className="py-2">
                  <h3  className="text-lg font-bold">Semantic similarity</h3>
                  <p>Keyword searches are based on textual similarites between words, making them ineffective for documents with semantically complicated insights.
                    Teleoscope uses USE document embeddings to deliver semantic similarities.
                  </p>
                </li>
                <li  className="py-2">
                  <h3  className="text-lg font-bold">Seamless navigation</h3>
                  <p>Teleoscope’s state of the art drag-and-drop interface enables seamless data navigation outside the confines of traditional rows and columns. 
                    Our streamlined user experience empowers analysts to delve into their data with ease, allowing analysts to focus on data exploration over data parsing.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="organize" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'organize' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Organize</h1>
              <ul className="px-16 py-4">
                <li className="py-2">
                  <h3  className="text-lg font-bold">Customized AI</h3>
                  <p>Teleoscope is designed to be used by researchers and analysts working on all kinds of research projects. Teleoscope allows you to customize its machine learning model to work best for you and your team. Using its dynamic workflows, you can quickly tailor its AI model to match and filter through your data.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="analyze" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'analyze' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Analyze</h1>
              <ul className="px-16 py-4">
                <li  className="py-2">
                  <h3  className="text-lg font-bold">Dataset Navigation</h3>
                  <p>Teleoscope is built with an extensive variety of options to make navigating your data easy. From basic searching to searches including or excluding a mix of terms, Teleoscope allows you to quickly explore your dataset while setting up your own intuitive search conditions.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="collaborate" className={`flex items-center justify-center p-8 ${activeHeaderSection === 'collaborate' ? '' : 'hidden'}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h1 className="text-4xl px-16 font-bold">Collaborate</h1>
              <ul className="px-16 py-4">
                <li  className="py-2">
                  <h3  className="text-lg font-bold">Traceable Results</h3>
                  <p>Understanding the origins of your conclusions and being able to cite them is a key part of research. Teleoscope’s traceable workflows display exactly which data entries influenced the insights it generated, providing researchers a clear understanding of each result’s provenance.</p>
                </li>
                <li  className="py-2">
                  <h3 className="text-lg font-bold">Open Ecosystem</h3>
                  <p>Teleoscope is designed to work seamlessly with the existing suite of tools you and your team already use. From importing data from external sources to exporting your results and analyses. Teleoscope seamlessly integrates with your existing tools.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="shadcn" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Submit</Button>
              </form>
            </Form>
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
