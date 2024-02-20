
import { Flare } from "@mui/icons-material";

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
  editLink: null,
  logo: <span>Teleoscope</span>,
  project: {
    link: "https://teleoscope.ca",
    icon: <Flare />,
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
