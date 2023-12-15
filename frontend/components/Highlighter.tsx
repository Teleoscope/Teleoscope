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

      return parts.map((part, index) => (
        regex.test(part) ? (
          `<span key="${index}" style="background-color: 'yellow'">${part}</span>`
        ) : (
          part
        )
      ));
    }
    const safeHtml = DOMPurify.sanitize(highlight(children));
    console.log("safe",safeHtml)

      return (
        <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
      );
}