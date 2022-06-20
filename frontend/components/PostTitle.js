import React, { useState } from "react";

// MUI imports
import ListItemText from "@material-ui/core/ListItemText";

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

      <ListItemText>
         {title}
      </ListItemText>
   )
}