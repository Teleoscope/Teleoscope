import {
    Stack,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from "@mui/material";
import { useAppSelector, useWindowDefinitions } from "@/lib/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSWRF } from "@/lib/swr";

export default function NotesViewer({ id }) {
  
  const { data: note } = useSWRF(`/api/note/${id}`);
  const { settings } = useAppSelector((state) => state.appState.workspace);
  const wdefs = useWindowDefinitions();

  return (
    <Accordion
      defaultExpanded={settings?.expanded}
      disableGutters={true}
      square={true}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel3a-content"
        id="panel3a-header"
      >
        <Typography noWrap align="left">
          {wdefs.definitions()["Note"].icon()}
          {`${note?.label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{note?.label}</Typography>
          <Divider></Divider>
          <Typography variant="small">{note?.content.blocks[0].text}</Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
    
  );
}
