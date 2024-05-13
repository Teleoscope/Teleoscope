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

export default function About() {
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-6xl font-bold">How It Works</h1>
      </div>

      <div className="grid grid-cols-2 grid-rows-3 p-8">
      <div className="flex items-center justify-center font-bold">
        <h1 className="text-6xl p-4">1</h1>
        <h2 className="text-4xl">Connect your data</h2>
      </div>
      <div className="flex items-center justify-center p-4">
        <p> 
          We offer seamless integration with your existing data pipelines so you can spend more time 
          exploring your data and less time parsing it. Simply connect your textual data to Teleoscope 
          to begin your data exploration journey. We support the most common textual data formats
          including Excel, CSV and JSON. We also offer custom data onboarding for clients working
          with sensitive data and privacy compliance measures.
        </p>
      </div>

      <div className="flex items-center justify-center p-4">
        <p>
          Teleoscope runs LLM models in the background to help you refine your data based on examples
          your domain experts are interested in. We use a drag-and-drop no-code interface to simplify
          data exploration for the Big Data world.
        </p>
      </div>
      <div className="flex items-center justify-center font-bold">
        <h1 className="text-6xl p-4">2</h1>
        <h2 className="text-4xl">Customize your models</h2>
      </div>

      <div className="flex items-center justify-center font-bold">
        <h1 className="text-6xl p-4">3</h1>
        <h2 className="text-4xl">Extract insights</h2>
      </div>
      <div className="flex items-center justify-center p-4">
        <p>
          Teleoscope provides traceable, replicable machine learning workflows that helps your organization
          sort, analyze, and extract value out of your data. No more AI black boxes.  
        </p>
      </div>

      </div>

    </main>
  );
}
