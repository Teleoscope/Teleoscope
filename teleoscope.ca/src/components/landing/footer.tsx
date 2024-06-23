import FooterLinks from "./FooterLinks";
import NewsletterSection from "./NewsletterSection";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center gap-4 border-t py-10">
      <section className="flex flex-col items-center justify-center gap-4 max-w-6xl w-full">
        <FooterLinks />
        <NewsletterSection />
      </section>
    </footer>
  );
}
