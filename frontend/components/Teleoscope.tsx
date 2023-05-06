// Teleoscope.js
import React, { useState, useContext } from 'react';

// mui
import LoadingButton from '@mui/lab/LoadingButton';

// custom components
import DocumentList from "./Documents/DocumentList"

// util
import { swrContext } from "@/util/swr"

export default function Teleoscope(props) {
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const swr = useContext(swrContext);
  const { teleoscope } = props.windata?.demo ? props.windata.demodata : swr.useSWRAbstract("teleoscope", `teleoscopes/${teleoscope_id}`);
  const data = teleoscope?.history[0]["rank_slice"];
    return (
      <>
        {teleoscope ? 
        <DocumentList
          data={data}
          pagination={true}
           ></DocumentList> : <LoadingButton loading={true} />}
      </>
    )

}