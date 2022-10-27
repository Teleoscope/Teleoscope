//PreprocessTitle.js
export function PreprocessTitle(title) {
   if (title) {
   	  String.prototype.trimLeft = function (charlist) {
      if (charlist === undefined) charlist = "s";
        return this.replace(new RegExp("^[" + charlist + "]+"), "");
   	  };
   	  var regex = new RegExp(
       "([\\[\\s\\?\\]]*)(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA|AItA|Am I the asshole|Aita|Am I the Asshole|Am I an Asshole)([\\[\\s\\?\\],]*)"
   	  );
      var title = title.replace(regex, "");
      var charlist = " -";
      title = title.trimLeft(charlist);
      var first = title.slice(0, 1);
      var sliced = first.toUpperCase() + title.slice(1);
      
      var ampreg = /&amp;/g
      var ret = sliced.replace(ampreg, "and")

      return ret;
   } else {
      return "Post Loading..."; 
   }
};


export function PreprocessText(text) {
   // TODO add any preprocessing needed
   return text;
}