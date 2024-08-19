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
import { WindowProps } from "../WindowFolder/WindowFactory";

export default function Document({ data: document }: WindowProps) {
  
  const text = document ? preprocessText(document.text, new RegExp("")) : "";

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
      <DocumentText text={text} />
    </Stack>
  );
}
