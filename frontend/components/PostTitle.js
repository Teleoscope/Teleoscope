import React, { useState } from "react";

// MUI imports
import ListItemText from "@material-ui/core/ListItemText";
import Typography from '@mui/material/Typography';

// fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const postTitle = (post) => {
   String.prototype.trimLeft = function (charlist) {
      if (charlist === undefined) charlist = "s";
      return this.replace(new RegExp("^[" + charlist + "]+"), "");
   };
   var regex = new RegExp(
      "(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA)"
   );
   if (post.hasOwnProperty("title")) {
      var title = post["title"].replace(regex, "");
      var charlist = " -";
      title = title.trimLeft(charlist);
      var first = title.slice(0, 1);
      var ret = first.toUpperCase() + title.slice(1);
      return ret;
   } else {
      return "Post Loading...";
   }

};


export default function PostTitle(props) {
   const title = postTitle(props.post);
   return (
      <Typography
         variant="body1"
         noWrap={true}
      >
         {title}
      </Typography>
   )
}