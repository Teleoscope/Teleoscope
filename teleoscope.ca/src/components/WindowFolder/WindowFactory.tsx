import Window from "@/components/WindowFolder/Window";
import { useWindowDefinitions } from "@/lib/hooks";
import { useSWRF } from "@/lib/swr";

export default function WindowFactory({ windata: w, node, ...props }) {
  const wdefs = useWindowDefinitions();
  const oid = node ? node.reference : ""

  const key = wdefs.apikeymap()[w.type];
  
  const { data } = useSWRF(`/api/${key}?${key}=${node?.reference}`);

  if (w.type == "FABMenu") {
    return <div>{wdefs.definitions()[w.type].component(w, oid, "#FFFFFF")}</div>;
  }

  return (
    <Window
      {...props}
      id={oid}
      icon={wdefs.definitions()[w.type].icon(data)}
      inner={wdefs.definitions()[w.type].component(w, oid, wdefs.definitions()[w.type].color(data))}
      showWindow={wdefs.definitions()[w.type].showWindow || w.showWindow}
      data={data}
      title={wdefs.definitions()[w.type].title(data)}
      color={wdefs.definitions()[w.type].color(data)}
      demo={w.demo}
      demodata={w.demodata}
    />
  );
}
