// mui
import { Stack, Box } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";
import { useStomp } from "@/util/Stomp";

// custom components
import DocumentListItem from "@/components/Documents/DocumentListItem";
import { loadBookmarkedDocuments } from "@/actions/windows";
import { NewItemForm } from "./NewItemForm";
import randomColor from "randomcolor";

export default function Bookmarks() {
  const bookmarks = useAppSelector((state: RootState) => state.windows.bookmarks);
  const settings = useAppSelector((state: RootState) => state.windows.settings);
    const dispatch = useAppDispatch();
    const client = useStomp();
    const session_id = useAppSelector((state: RootState) => state.activeSessionID.value);

    const handleMakeGroupFromBookmarks = (e) => {
      client.add_group(
        e.target.value,
        randomColor(),
        session_id,
        bookmarks
      );
      dispatch(loadBookmarkedDocuments([]));
    };
  return (
    <Stack direction="column">
      {bookmarks.length > 0 ? 
        <NewItemForm label={"Create group from bookmarks..."} HandleSubmit={handleMakeGroupFromBookmarks}/> : <></>
      }
      
      <Box>
        {bookmarks.map((docid) => (
          <DocumentListItem key={docid} id={docid}>
            {" "}
          </DocumentListItem>
        ))}
      </Box>
    </Stack>
  );
}
