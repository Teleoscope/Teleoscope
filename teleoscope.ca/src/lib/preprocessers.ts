// preprocessTitle.ts

export function preprocessText(text: string, regex: RegExp): string {
  const trimLeft = (str: string, charlist: string = "s"): string => {
    return str.replace(new RegExp("^[" + charlist + "]+"), "");
  };

  text = text.replace(regex, "");

  const charlist = " -";
  text = trimLeft(text, charlist);

  const first = text.charAt(0).toUpperCase();
  const sliced = first + text.slice(1);

  const ampReg = /&amp;/g;
  const result = sliced.replace(ampReg, "and");

  return result;
}

export function preprocessTitle(title: string): string {
  if (!title) {
    return "Document Loading...";
  }
  const regex = /([\[\s\?\],\:]*)(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA|AItA|Am I the asshole|Aita|Am I the Asshole|Am I an Asshole)([\[\s\?\],\:]*)/;
  const text = preprocessText(title, regex)
  return text;
}