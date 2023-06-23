export function extractSpecialCharacters(text) {
    // Matches Emoji and other special Unicode characters
    const specialCharactersRegex = /(\p{Emoji})|([\u0080-\uFFFF])/gu;
    return [...text.matchAll(specialCharactersRegex)].map(match => match[0]);
}

export function stripEmojis(text) {
    const specialCharactersRegex = /(\p{Emoji})|([\u0080-\uFFFF])/gu;
    return text.replace(specialCharactersRegex, '');
}
  
export function makeQuery(text) {
  const buffer = text.replace(/"/g, '\\"').trim();
  const regex = extractSpecialCharacters(buffer);

  if (regex.length == 0) {
    return { $text: { $search: buffer} };
  }

  if (stripEmojis(buffer).length == 0) {
    return { text: { $regex: regex.join('|') } }
  }

  console.log("text:", buffer, regex, regex.join('|'))

  return {
      $and: [
          { $text: { $search: buffer} },
          {  text: { $regex: regex.join('|') } }
      ]
  };
}