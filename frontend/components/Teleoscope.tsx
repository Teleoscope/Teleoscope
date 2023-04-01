// Teleoscope.js
import React, { useState } from 'react';

// mui
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

// actions
import { useAppSelector, useAppDispatch } from '../hooks'
import { RootState } from '../stores/store'
import { setMagnitude } from "../actions/teleoscopes";

// custom components
import DocumentList from "./Documents/DocumentList"

// util
import useSWRAbstract from "../util/swr"

export default function Teleoscope(props) {
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const { teleoscope } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);

  const data = teleoscope?.history[0]["rank_slice"];
 
    return (
      <>
        {teleoscope ? <DocumentList pagination={true} data={data}></DocumentList> : <LoadingButton loading={true} />}
      </>
    )

}