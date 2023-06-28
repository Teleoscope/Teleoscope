import Window from "@/components/WindowFolder/Window";
import { useSWRHook } from "@/util/swr";
import { useWindowDefinitions } from "@/util/hooks";

export default function WindowFactory(props) {
  const w = props.windata;
  const wdefs = useWindowDefinitions();
  const type = w.type;
  const oid = w?.oid ? w.oid : w.i.split("%")[0];

  const uid = w?.uid ? w.uid : "000000"
  const id = props?.id ? props.id : `${oid}%${uid}%${type}`;

  const key = wdefs.apikeymap()[type];
  const swr = useSWRHook();
  const { data } = w?.demo 
    ? w.demodata
    : swr.useSWRAbstract("data", `${key}/${oid}`);

  if (w.type == "FABMenu") {
    return <div>{wdefs.definitions()[w.type].component(w, id, "#FFFFFF")}</div>;
  }

  return (
    <Window
      {...props}
      id={id}
      icon={wdefs.definitions()[w.type].icon(data)}
      inner={wdefs.definitions()[w.type].component(w, id, wdefs.definitions()[w.type].color(data))}
      showWindow={wdefs.definitions()[w.type].showWindow || w.showWindow}
      data={data}
      title={wdefs.definitions()[w.type].title(data)}
      color={wdefs.definitions()[w.type].color(data)}
      demo={w.demo}
      demodata={w.demodata}
    />
  );
}
