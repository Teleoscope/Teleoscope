import { Stack, Typography } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import DocumentList from "@/components/Documents/DocumentList";
import Count from "@/components/Count";
import Histogram from "@/components/Histogram";
import ButtonActions from "@/components/ButtonActions";
import { WindowProps } from "../WindowFolder/WindowFactory";


const Status = (node) => {
  if (node) {
    if (node.doclists.length > 0) {
      return (
        <Stack direction="row" sx={{ width: "100%" }} spacing={2} alignItems="center" justifyContent="center">
          <Count label="Number of results" loading={node ? false : true} count={node.doclists.reduce((a, d) => a + d.ranked_documents.length, 0)} />
          <Histogram data={node.doclists[0].ranked_documents}></Histogram>
        </Stack>
      );
    }
    if (node.edges.control.length > 0) {
      return <Typography sx={{ width: "100%" }} align="center" variant="caption">
        {node.status}</Typography>;
    }
  }
  return null;
};

// Additional props can be included as needed
export default function SetOperation({ data, reactflow_node, graph_node: node }: WindowProps) {
  if (!node) {
    return <>Loading operation...</>
  }
  const doclists = node?.doclists;

  return (
    <>
      <ButtonActions inner={[[Status, node]]}></ButtonActions>
      {node ? (
        <DocumentList data={doclists} pagination={true}></DocumentList>
      ) : (
        <LoadingButton loading={true} />
      )}
    </>
  );
}
