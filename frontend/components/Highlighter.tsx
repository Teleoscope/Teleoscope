import React from 'react';
import { useSelector } from "react-redux";

export default function Highlighter({ children }) {
    const nodes = useSelector((state) => state.windows.nodes);
    const query = nodes
        .filter(n => n.type == "Search" && n.data.query)
        .map(n => n.data.query.replace("-", '').split(" "))
        .reduce((acc, n) => acc.concat(n), [])
        
    const highlight = (text) => {
        if (query.length === 0) {
            // Return text without highlighting if query is empty
            return text;
          }
      const regex = new RegExp(`\\b(${query.join('|')})\\b`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) => (
        regex.test(part) ? (
          <span key={index} style={{ backgroundColor: 'yellow' }}>{part}</span>
        ) : (
          part
        )
      ));
    }
    

      return (
        <>{highlight(children)}</>
      );
};