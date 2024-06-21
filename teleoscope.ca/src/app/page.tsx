import Menu from "@/components/CorporateMenu";
import Hero from "@/components/landing/hero";
import DemoCTA from "@/components/landing/demoCTA";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
        <Menu/>
        <Hero/>
        <DemoCTA/>
        <Footer/>
    </main>
  );
}
