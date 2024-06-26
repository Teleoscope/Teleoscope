// custom
import DocumentText from "@/components/Documents/DocumentText";

// mui
import { Stack } from "@mui/material";

//utils
import { preprocessText } from "@/lib/preprocessers";
import ButtonActions from "@/components/ButtonActions";
import {
    SaveXLSX,
    SaveDocx,
    CopyJson,
    CopyText,
    Link,
    Group,
} from "@/components/Documents/DocumentActions";

export default function Document(props) {
  const id = props.id.split("%")[0];
  
  const { document } = useSWRF("document", `document/${id}`);
  const text = document ? preprocessText(document.text) : false;

  return (
    <Stack sx={{ height: "100%" }}>
      <ButtonActions
        inner={[
          [SaveXLSX, { document: document }],
          [SaveDocx, { document: document }],
          [CopyJson, { document: document }],
          [CopyText, { document: document }],
          [Link, { document: document }],
          [Group, { document: document }],
        ]}
      ></ButtonActions>
      <DocumentText text={text} id={id} />
    </Stack>
  );
}
