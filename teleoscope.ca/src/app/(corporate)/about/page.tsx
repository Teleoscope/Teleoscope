import DemoCTA from "@/components/landing/DemoCTA";
import Footer from "@/components/landing/Footer";
import HowItWorksInfoCards from "@/components/landing/HowItWorksInfoCards";

export default function Home() {
  return (
    <main>
      {/* <LandingPageHero /> */}
      <HowItWorksInfoCards />
      <DemoCTA />
      <Footer />
    </main>
  );
}
