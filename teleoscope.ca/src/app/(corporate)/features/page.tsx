////////////////////////////////////////////////////////////////////////////////
// page.tsx
// Teleoscope front page
// ---------------------
// @author Paul Bucci
// @year 2024
////////////////////////////////////////////////////////////////////////////////
// <------------------------------- 80 chars -------------------------------> //
// 456789|123456789|123456789|123456789|123456789|123456789|123456789|1234567890
////////////////////////////////////////////////////////////////////////////////
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Features() {
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold">Explore the Future of Research</h1>
      </div>
      <div className="flex items-center justify-center p-4">
        <h2 className="text-lg">Discover more and empower your research with Teleoscope</h2>
      </div>
      <div className="flex items-center justify-center p-4">
        <Button variant="default">
          <Link href="/product-demonstrations" legacyBehavior passHref>
            <h1 className="text-xl">Book a demo</h1>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 grid-rows-4 items-center justify-center gap-4 p-4">
        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Dataset Navigation</h2>
          <p>Teleoscope is built with an extensive variety of options to make navigating your data easy. From basic searching to searches including or excluding a mix of terms, Teleoscope allows you to quickly explore your dataset while setting up your own intuitive search conditions.</p>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Image</h1>
        </div>

        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Workflow Whiteboarding</h2>
          <p>Design your own customizable workflows to suit your unique needs. String together functions within Teleoscope to develop seamless complex workflows</p>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Image</h1>
        </div>

        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Teleoscope Ranking</h2>
          <p>Unlock your dataset using Teleoscope’s innovative “search-by-example” ranking tool. Discover relevant data like never by selecting a datapoint of interest and using “search-by-example” find similar text entries. “Search-by-example” allows you to leverage artificial intelligence to identify emerging patterns within your data with ease.</p>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Image</h1>
        </div>

        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Automatic Trend Analysis</h2>
          <p>Develop and identify trends from your data using our intelligent machine learning system. Using the workflows you design and determine, Teleoscope empowers you to quickly cluster your data into groups based on trends within your data set, allowing you to explore the articles belonging to each grouping.</p>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Image</h1>
        </div>
      </div>

 
    </main>
  );
  }
  