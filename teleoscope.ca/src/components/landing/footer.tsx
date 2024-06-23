import NewsletterSection from "./NewsletterSection";

// TODO: Add footer content
export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center gap-4 border-t py-10">
        <section className="flex flex-col items-center justify-center gap-4 max-w-6xl w-full">
    <FooterDetails />
      <NewsletterSection />
    </section>
    </footer>
  );
}

function FooterDetails() {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-lg">
        </span>
    </div>
    );
}