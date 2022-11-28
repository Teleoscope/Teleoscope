// Teleoscope.js
import React, { useState } from 'react';
import { useCookies } from "react-cookie";

// mui
import { styled, alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
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
  const { teleoscope, teleoscope_loading } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);
  const magnitude = useAppSelector((state: RootState) => state.teleoscopes.magnitude);
  const dispatch = useAppDispatch();

  var data = teleoscope?.history[0]["rank_slice"];
  const DiscreteSlider = () => {
    return (
      <Box sx={{ width: "50%"}}>
        <Slider
          size="small"
          aria-label="Teleoscope Magnitude"
          valueLabelDisplay="auto"
          getAriaValueText={v => v.toString()}
          defaultValue={magnitude} step={0.1} marks min={0} max={1}
          onChangeCommitted={(e, value: number) => {dispatch(setMagnitude(value))}}
        />
      </Box>
    );
  }
    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <Stack direction="row" justifyContent="center" alignItems="center" style={{ margin: 0 }}>
          <Typography sx={{mr: 1}}>Magnitude</Typography>
          <DiscreteSlider />
        </Stack>
        <Divider />
        {teleoscope ? <DocumentList pagination={true} data={data}></DocumentList> : <LoadingButton loading={true} />}
      </div>
    )

  



}