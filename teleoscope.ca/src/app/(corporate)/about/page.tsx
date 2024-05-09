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
        <h1 className="text-4xl font-bold">How It Works</h1>
      </div>

      <div className="grid grid-cols-2 grid-rows-4 p-8">
        <div className="gap-4">
          <h2 className="text-3xl font-bold">Keyword search</h2>
        </div>
        <div>

        </div>

        <div>

        </div>
        <div>
          <h2 className="text-3xl font-bold">Document exploration</h2>
        </div>

        <div>
          <h2 className="text-3xl font-bold">Group documents of interest</h2>
        </div>
        <div>

        </div>

        <div>
        </div>
        <div>
          <h2 className="text-3xl font-bold">Refine and iterate your results</h2>
        </div>



      </div>

    </main>
  );
}
