import Menu from "@/components/landing/CorporateMenu";
import DemoCTA from "@/components/landing/demoCTA";
import LandingPageHero from "@/components/landing/LandingPageHero";
import LandingPageInfoCards from "@/components/landing/LandingPageInfoCards";
import Footer from "@/components/landing/footer";

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
