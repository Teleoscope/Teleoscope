import Menu from "@/components/landing/CorporateMenu";
import DemoCTA from "@/components/landing/demoCTA";
import Footer from "@/components/landing/footer";
import HowItWorksInfoCards from "@/components/landing/HowItWorksInfoCards";

export default function About() {
  return (
    <main>
      <Menu />
      <HowItWorksInfoCards />
      <DemoCTA />
      <Footer />
    </main>
  );
}
