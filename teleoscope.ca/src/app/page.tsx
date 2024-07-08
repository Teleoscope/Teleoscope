import Menu from "@/components/landing/CorporateMenu";
import DemoCTA from "@/components/landing/DemoCTA";
import LandingPageHero from "@/components/landing/LandingPageHero";
import LandingPageInfoCards from "@/components/landing/LandingPageInfoCards";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <Menu />
      <LandingPageHero />
      <LandingPageInfoCards />
      <DemoCTA />
      <Footer />
    </main>
  );
}
