
import { Flare } from "@mui/icons-material";
import { BsDiscord } from "react-icons/bs";

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
  editLink: false,
  logo: <span>Teleoscope</span>,
  project: {
    link: "https://teleoscope.ca",
    icon: <Flare />,
    docsRepositoryBase: "https://github.com/Teleoscope/Teleoscope/"
  },
  docsRepositoryBase: "https://github.com/Teleoscope/Teleoscope/",
  primaryHue: 268,
  chat: {
    link: "https://discord.gg/3PyFEybpr9",
    icon: <BsDiscord />
  }
  // feedback: {
    
  // }
  // ...
};
