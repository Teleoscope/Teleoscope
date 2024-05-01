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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': any;  // Use `any` or a more specific type if available
    }
  }
}

export default function Pricing() {
  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <h1 className="text-3xl font-bold">Teleoscope Subscriptions and Pricing</h1>
      </div>

      <div>
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
            <stripe-pricing-table pricing-table-id="prctbl_1P9FT9P5ukdlCTTci88k8GUK"
                                  publishable-key="pk_live_51OzPc7P5ukdlCTTc7nAVSOfSgAj9s6pfJeD3nCS90kblIazeoYg9sPzEU5QwgjaQ0DIOGw6lLrw7E0qKDzgVQwLs00xo5vIEYB">
            </stripe-pricing-table>
      </div>
    </main>
  );
}
