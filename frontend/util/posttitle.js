//posttitle.js
export default function postTitle(post) {
   if (post) {
   	  String.prototype.trimLeft = function (charlist) {
      if (charlist === undefined) charlist = "s";
        return this.replace(new RegExp("^[" + charlist + "]+"), "");
   	  };
   	  var regex = new RegExp(
       "(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA)"
   	  );
      var title = post.replace(regex, "");
      var charlist = " -";
      title = title.trimLeft(charlist);
      var first = title.slice(0, 1);
      var ret = first.toUpperCase() + title.slice(1);
      return ret;
   } else {
      return "Post Loading...";
   }

};
