
export function containsEmoji(text) {
    const emojiRegex = /\p{Emoji}/u;
    return emojiRegex.test(text);
  }
  
export function extractEmojis(text) {
    const emojiRegex = /\p{Emoji_Presentation}/gu;
    return [...text.matchAll(emojiRegex)].map(match => match[0]);
  }
  
export function stripEmojis(text) {
    return text.replace(/\p{Emoji_Presentation}/gu, '');
  }
  
export function emojiRegex(emojis) {
    const pattern = emojis.join('|');
    return new RegExp(`(${pattern})`, 'gu');
  }

export  function makeQuery(text) {
    if (containsEmoji(text)) {
        const regex = emojiRegex(extractEmojis(text))
        const cleantext = stripEmojis(text.replace(/"/g, '\\"').trim())
  
        if (cleantext.length == 0) {
          return {
            text: { $regex: regex }
          }
        }
  
        return {
            $and: [
                { $text: { $search: cleantext} },
                { text: { $regex: regex } }
            ]
        };
    }
  
    return {
        $text: {
            $search: text.replace(/"/g, '\\"')
        }
    };
  }