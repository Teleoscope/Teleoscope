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
        <h1 className="text-3xl font-bold">Our Team</h1>
      </div>

      <div className="flex items-center justify-center p-4">
        <h2 className="text-2xl font-bold">We strive to empower researchers to make impactful change in the world.</h2>
      </div>

      <div className="grid grid-cols-2 grid-rows-2 items-center justify-center gap-4 p-4">
        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Made by researchers for researchers</h2>
          <p>Blurb about our company/team backstory</p>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Screenshot</h1>
        </div>

        <div className="items-center justify-center p-4">
          <h2 className="text-xl font-bold">Why we built Teleoscope</h2>
        </div>
        <div className="items-center justify-center p-4">
          <h1 className="text-xl rounded bg-gray-200 p-4">Screenshot</h1>
        </div>
      </div>
    </main>
  );
}
