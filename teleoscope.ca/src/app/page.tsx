import Menu from "@/components/CorporateMenu";
import Hero from "@/components/landing/hero";
import DemoCTA from "@/components/landing/demoCTA";
import Footer from "@/components/landing/footer";
import InfoCards from "@/components/landing/InfoCards";

export default function Home() {
  return (
    <main>
        <Menu/>
        <Hero/>
        <InfoCards/>
        <DemoCTA/>
        <Footer/>
    </main>
  );
}
