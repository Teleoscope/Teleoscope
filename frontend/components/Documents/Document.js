// Window.js
import React, { useContext } from "react";

// custom
import DocumentText from "./DocumentText";

// mui
import { Stack, IconButton } from "@mui/material";

//utils
import { swrContext } from "@/util/swr";
import { PreprocessText } from "@/util/Preprocessers";
import ButtonActions from "../ButtonActions";
import { SaveDocx, CopyJson, CopyText, Link, Group } from "./DocumentActions";

export default function Document(props) {
  const id = props.id.split("%")[0];
  const swr = useContext(swrContext);
  const { document } = swr.useSWRAbstract("document", `document/${id}`);
  const text = document ? PreprocessText(document.text) : false;

  return (
    <Stack sx={{ height: "100%" }}>
      <ButtonActions
        inner={[
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
