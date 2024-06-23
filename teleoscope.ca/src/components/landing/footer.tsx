import FooterLinks from "./FooterLinks";
import NewsletterSection from "./NewsletterSection";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center gap-4 border-t py-10">
      <section className="flex flex-col items-center justify-center gap-4 max-w-6xl w-full">
        <FooterLinks />
        <NewsletterSection />
        <div className="flex justify-between w-full gap-2 px-10">
            <span className="text-sm">© 2024 Teleoscope. All rights reserved.</span>
            <span className="text-sm">Made with 🩷 for researchers by researchers</span>
        </div>
      </section>
    </footer>
  );
}
