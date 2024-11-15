import { GithubIcon, LinkedinIcon } from "lucide-react";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/102070507/",
    icon: <LinkedinIcon />,
  },
  {
    label: "GitHub",
    href: "https://github.com/Teleoscope",
    icon: <GithubIcon />,
  },
];

const links = [
  {
    groupLabel: "Product",
    links: [
      {
        label: "How It Works",
        href: "/about",
      },
      {
        label: "Pricing",
        href: "/pricing",
      },
      {
        label: "Resources",
        href: "https://teleoscope.ca/",
      },
      {
        label: "Get Started",
        href: "/auth/signup",
        variant: "primary",
      },
    ],
  },
  {
    groupLabel: "Company",
    links: [
      {
        label: "About Us",
        href: "/about",
      },
      {
        label: "Contact",
        href: "/contact",
      },
      {
        label: "Privacy Policy",
        href: "/privacy",
      },
      {
        label: "Terms of Service",
        href: "/terms",
      },
    ],
  },
];

export default function FooterLinks() {
  return (
    <div className="flex  gap-4 w-full py-5 px-10">
      <div className="flex flex-col gap-2 flex-1">
        <a href="/" className="font-bold text-2xl">
          <img src="/assets/LogoInc.svg" style={{ height: '50px' }} alt="Teleoscope corporate logo"/>
        </a>
        <div className="flex gap-2">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>

      <section className={`grid grid-cols-2 gap-4 flex-1 `}>
        {links.map((group) => (
          <div key={group.groupLabel} className="flex flex-col gap-2">
            <h2 className="font-bold">{group.groupLabel}</h2>
            {group.links.map((link) => (
              <a key={link.label} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
