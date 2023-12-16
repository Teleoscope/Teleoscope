import { useSelector } from "react-redux";
import DOMPurify from 'dompurify';

export default function Highlighter({ children }) {
    const nodes = useSelector((state) => state.windows.nodes);
    const query = nodes
        .filter(n => n.type == "Search" && n.data.query)
        .map(n => n.data.query.replace("-", '').trim().split(" "))
        .reduce((acc, n) => n.length > 0 ? acc.concat(n) : acc, [])
        
    const highlight = (text) => {
      const regstring = `\\b(${query.join('|')})\\b`;
      if (query.length === 0 || regstring == `/\b()\b/gi` || (query.length == 1 && query[0] == '') ) {
        // Return text without highlighting if query is empty
        return text;
      }
          

    
      const regex = new RegExp(regstring, 'gi');
      
      const parts = text ? text.split(regex) : []

      const highlighted = parts.map((part, index) => {
        if (regex.test(part)) {
          const highlighted_span = `<span key="${index}" style="background-color: yellow">${part}</span>`
          console.log("span", highlighted_span)
          return highlighted_span
        } else {
          return part
        }
      })
      return highlighted.join("")
        
      
    }
    const safeHtml = DOMPurify.sanitize(highlight(children));
    console.log("safe",safeHtml)

      return (
        <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
      );
}