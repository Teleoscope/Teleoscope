import { useSelector } from "react-redux";
import Markdown from 'react-markdown';
import { Box, Typography } from "@mui/material";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from '@mui/material/styles';

export default function Highlighter({ children }) {
  const theme = useTheme();
  const nodes = useSelector((state) => state.appState.workflow.nodes);
    const query = nodes
        .filter(n => n.type == "Search" && n.data.query)
        .map(n => n.data.query.replace("-", '').trim().split(" "))
        .reduce((acc, n) => n.length > 0 ? acc.concat(n) : acc, [])

    const highlight = (text) => {
      if (!text) { return ""}
      const regstring = `(${query.join('|')})`;
      
      if (query.length === 0 || regstring == `/\b()\b/gi` || (query.length == 1 && query[0] == '') ) {
        // Return text without highlighting if query is empty
        return text;
      }
      
      const regex = new RegExp(regstring, 'gi');
      const replaced = text.replaceAll(regex, '<span>$1</span>')
      return replaced
    }

  return (
    <Markdown
      remarkPlugins={[ remarkGfm ]}
      rehypePlugins={[ rehypeRaw, rehypeSanitize ]}
      components={{
        p: ({ node, ...props }) => <Typography paragraph {...props} sx={{}} />,
        h1: ({ node, ...props }) => <Typography variant="h4" {...props} />,
        span: ({ node, ...props }) =><Typography variant="body" style={{ backgroundColor: "yellow"}} {...props} />,
        code: ({children, className, node, ...props}) => {
          const match = /language-(\w+)/.exec(className || '')
          return (
            <Box sx={{ p: 0, borderRadius: "5px",  borderWidth: 1, overflow: "hidden", m: 0
              , borderColor: theme.palette.grey["100"], borderStyle: "solid"
            }}>
            <SyntaxHighlighter
              {...props}
              PreTag="div"
              language={match ? match[1] : 'text'}
              showLineNumbers
              style={theme.palette.mode === 'dark' ? oneDark : oneLight}
              customStyle={{ padding: "0.9em", overflow: "auto", margin: 0,
                fontSize: "0.8em"
              }}
            >{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
            </Box>
          );
        }
      }}
    >{highlight(children)}</Markdown>
  );
}