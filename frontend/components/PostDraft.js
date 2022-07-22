// PostDraft.js
import * as React from 'react';

// mui
import IconButton from '@mui/material/IconButton';
import ShortTextIcon from '@mui/icons-material/ShortText';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';


//utils
import useSWRAbstract from "../util/swr"
import postTitle from "../util/posttitle"

export default function Post(props) {
  const { post } = useSWRAbstract("post", `/api/posts/${props.id}`);
  const title = post ? post.title : false;
  console.log("posty", post, title)

  return (

    <Tooltip title={title}>
    <Chip 
    	avatar={<ShortTextIcon/>} 
    	label={postTitle(title)} 
		variant="outlined"

    />
		
      
    </Tooltip>

    
  );
}