// mui
import { Stack, Box } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// custom components
import DocumentListItem from "@/components/Documents/DocumentListItem";
import { NewItemForm } from "@/components/NewItemForm";
import randomColor from "randomcolor";
import { makeGroupFromBookmarks } from "@/actions/windows";

export default function Bookmarks() {
  const bookmarks = useAppSelector((state: RootState) => state.windows.bookmarks);
  const dispatch = useAppDispatch();

  const handleMakeGroupFromBookmarks = (e) => {
    dispatch(makeGroupFromBookmarks({
      label: e.target.value,
      color: randomColor(),
      documents: bookmarks,
    }))
  }

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
