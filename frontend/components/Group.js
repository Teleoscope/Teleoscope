import * as React from 'react';

// mui
import IconButton from '@mui/material/IconButton';
import TopicIcon from '@mui/icons-material/Topic';
import Tooltip from '@mui/material/Tooltip';

//utils
import useSWRAbstract from "../util/swr"

export default function Group(props) {
  const { group } = useSWRAbstract("group", `/api/groups/${props.id}`);
  const color = group?.color;
  const label = group?.label;
  console.log("groupy", group, label, color)

  return (
    <Tooltip title={label}>
      <IconButton 
        
        sx={{
          boxShadow: '3',
          color: color
        }}
        variant="outlined"
      >
        <TopicIcon />
      </IconButton>
    </Tooltip>
    
  );
}