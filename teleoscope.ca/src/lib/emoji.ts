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
  const trimmedText = text.trim();
  const regex = extractSpecialCharacters(trimmedText);

  // Only escape the quotes for regex search
  const bufferForRegex = trimmedText.replace(/"/g, '\\"');
  
  if (regex.length === 0) {
      return { $text: { $search: trimmedText} };
  }

  if (stripEmojis(trimmedText).length === 0) {
      return { text: { $regex: regex.join('|') } };
  }

  return {
      $and: [
          { $text: { $search: trimmedText} },
          { text: { $regex: bufferForRegex } }
      ]
  };
}
