import { Document, PageBreak, Packer, Paragraph, TextRun } from "docx";
import FileSaver from "file-saver";

// Documents contain sections, you can have multiple sections per document, go here to learn more about sections
// This simple example will only contain one section

export function MakeDocx({ tag, title, groups }) {
  const sections = groups.map((group) => {
    const docs = group.documents.map((doc) => {
      const title = new Paragraph({
        children: [
          new TextRun({
            text: `Title: `,
            bold: true,
          }),
          new TextRun(doc.title),
        ],
      });

      const body = new Paragraph({
        children: [
          new TextRun({
            text: `Body: `,
            bold: true,
          }),
          new TextRun(doc.text),
        ],
      });

      const metadata_label = new Paragraph({
        children: [new TextRun({ text: "metadata: ", bold: true })],
      });

      const metadata = Object.entries(doc.metadata).map(([key, value]) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: `${key}: `,
              bold: true,
            }),
            new TextRun(JSON.stringify(value)),
          ],
        });
      });

      const Break = new Paragraph({
        children: [new PageBreak()],
      });

      return [title, body, metadata_label, ...metadata, Break];
    });

    const GroupTitle = group.label
      ? new TextRun({
          text: `${group.label}: `,
          bold: true,
        })
      : new TextRun("");

    return {
      properties: {},
      children: [
        new Paragraph({
          children: [GroupTitle],
        }),
        ...docs.flat(),
      ],
    };
  });

  const FirstPage = {
    properties: {},
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `${tag}: `,
            bold: true,
          }),
          new TextRun(title),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Report:",
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Number of included groups: ",
            bold: true,
          }),
          new TextRun(`${groups.length}`),
        ],
      }),
    ],
  };

  const doc = new Document({
    sections: [FirstPage, ...sections],
  });

  Packer.toBlob(doc).then((blob) => {
    // saveAs from FileSaver will download the file
    FileSaver.saveAs(blob, "example.docx");
  });
}
