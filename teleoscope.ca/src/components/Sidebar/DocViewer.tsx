import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import { DocumentActions } from "@/components/Documents/DocumentActions";
import Highlighter from "@/components/Highlighter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { Button } from "../ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useSWRF } from "@/lib/swr";

export default function DocViewer({ id, windata }) {
  const [isOpen, setIsOpen] = useState(true);

  
  const { data: document } = windata?.demo
    ? windata.demodata
    : useSWRF(`/api/document/${id}`);
  const settings = useAppSelector((state) => state.appState.workflow.settings);
  const wdefs = useWindowDefinitions();

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full space-y-2"
    >
      <div className="flex w-full items-center justify-between space-x-4 px-4 overflow-hidden">
        <h4 className="text-sm font-semibold flex items-center space-x-2 w-ful overflow-hidden">
          {wdefs.definitions()["Document"].icon()}
          <span className="truncate   overflow-hidden whitespace-nowrap flex-shrink">
            {document?.title}
          </span>
        </h4>
        <CollapsibleTrigger asChild className="flex-shrink-0 w-10">
          <Button variant="ghost" size="sm">
            <CaretSortIcon className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <section className="flex flex-col gap-2 p-2 px-3">
          <DocumentActions document={document} />
          <div className="flex flex-col gap-2 w-full overflow-scroll">
            <Highlighter>{document?.text}</Highlighter>
          </div>
          <DocMetaData metadata={document?.metadata} />
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DocMetaData({ metadata }) {
  function metaDataMapper(key, value) {
    if (value === null) {
      return null;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      return (
        <div className="flex flex-row gap-2 items-center">
          {/* <Button className="p-1 px-2 text-2xs h-fit font-normal bg-neutral-700 text-white">
            View
          </Button> */}
          <p>{JSON.stringify(value)}</p>
        </div>
      );
    }

    if (typeof value === "string" || typeof value === "number") {
      return (
        <div className="flex w-fit flex-row space-x-2 rounded-md  p-1 border px-2">
          <span>{value}</span>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="flex flex-row gap-2">
          {metadata[key].map((v) => {
            return (
              <div
                key={v}
                className="flex w-fit flex-row space-x-2 rounded-md  p-1 border px-2"
              >
                <span>{v}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return <>{JSON.stringify(value)}</>;
  }
  if (!metadata) return null;
  return (
    <div className="flex flex-col justify-between overflow-hidden border w-full rounded-sm bg-neutral-50 border-neutral-200">
      <Table className=" border-collapase ">
        <TableBody className="w-full gap-0 space-y-0 rounded-sm">
          {Object.entries(metadata).map(([key, value]) => {
            return (
              <TableRow key={key + value} className="p-0 border-neutral-200">
                <TableCell className="truncate text-xs max-w-32 font-medium border-r border-neutral-200 ">
                  {key}
                </TableCell>
                <TableCell className="text-xs bg-white">
                  {metaDataMapper(key, value)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
