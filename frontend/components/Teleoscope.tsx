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

// custom components
import PostList from "./PostList"

// util
import useSWRAbstract from "../util/swr"

export default function Teleoscope(props) {
  const [teleoscope_id] = useState(props.id.split("%")[0]);
  const [weight, setWeight] = useState<number>(.3);
  const { teleoscope, teleoscope_loading } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);


  var data = teleoscope?.history[0]["rank_slice"];
  const DiscreteSlider = () => {
    return (
      <Box sx={{ width: 300 }}>
        <Slider
          size="small"
          aria-label="Teleoscope weight"
          valueLabelDisplay="auto"
          getAriaValueText={v => v.toString()}
          defaultValue={weight} step={0.1} marks min={0} max={1}
          onChangeCommitted={(e, value: number) => {setWeight(value)}}
        />
      </Box>
    );
  }
    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <Stack direction="row" justifyContent="center" alignItems="center" style={{ margin: 0 }}>
          <Typography sx={{mr: 2}}> Weight</Typography>
          <DiscreteSlider />
        </Stack>
        <Divider />
        {teleoscope ? <PostList pagination={true} data={data}></PostList> : <LoadingButton loading={true} />}
      </div>
    )

  



}