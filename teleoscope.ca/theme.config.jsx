
export default {
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Teleoscope'
    }
  },
  head: (
    <>
      <meta property="og:title" content="Teleoscope" />
      <meta property="og:description" content="Large document set exploration" />
    </>
  ),
  // editLink: null,
  logo: <img src="/assets/LogoInc.svg" style={{ height: '30px' }} alt="Teleoscope logo round"/>,
  project: {
    link: "https://teleoscope.ca",
    icon: <img src="/assets/LogoRound.svg" style={{ height: '30px' }} alt="Teleoscope logo round"/>,
  },
  docsRepositoryBase: "https://example.com/",
  primaryHue: 268,
  // chat: {
  //   link: "https://discord.gg/3PyFEybpr9",
  //   icon: <BsDiscord />
  // }
  // feedback: {
    
  // }
  // ...
};
