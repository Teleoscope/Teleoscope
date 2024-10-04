import Image from "next/image";
import Link from "next/link";


export type SidebarOption = {
  label: string;
  href: string;
  icon: React.ReactNode;
  className: string;
};

function capitalizeFirstLetter(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

export function Sidebar({children, sidebarOptions,
  haveSections = true

} : {sidebarOptions: Record<string, SidebarOption[]>, children: React.ReactNode, haveSections: boolean}) {
    return (
      <div className="flex flex-col h-screen bg-appPrimary-50 bg-opacity-20 border-r  w-64 overflow-hidden">
      {children}
        {Object.entries(sidebarOptions).map(([key, options]) => (
          <div className="flex flex-col pt-2  pb-6 " key={key}>
            {haveSections && <span className="text-md font-semibold p-4 py-2 ">
              {capitalizeFirstLetter(key)}
            </span>}
            <div className="flex flex-col gap-2 flex-1 px-2 ">
              {options.map((option) => (
                <Link key={option.label} href={option.href} className={option.className}>
                  <span className="flex items-center gap-4 p-2 rounded-lg text-md hover:bg-gray-200 cursor-pointer">
                    {option.icon}
                    <span>{option.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col flex-1  justify-end  ">
            {/* <SidebarPlanUpgradeCard /> */}
          <Link href="/public" className="w-full border-t p-2 flex justify-center">
          <Image
            src={"/assets/TeleoscopeLogo.svg"}
            alt="Logo"
            width={80}
            height={20}
          />
          </Link>
        </div>
      </div>
    );
  }
