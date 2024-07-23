import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from "@mui/material";
import { useAppSelector } from "@/lib/hooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";
import Note from "../Notes/Note";

export default function NotesViewer({ id }) {
  
  const { data: note } = useSWRF(`/api/note?uid=${id}`);
  const { settings } = useAppSelector((state) => state.appState.workspace);
  const { color } = useAppSelector((state) => state.appState.workflow.settings);
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
          {WindowDefinitions("Note").icon(color)}
          {`${note?.label}`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} sx={{ margin: "1em" }}>
          <Typography variant="h5">{note?.label}</Typography>
          <Divider></Divider>
          <Note data={note} ></Note>
        </Stack>
      </AccordionDetails>
    </Accordion>
    
  );
}
