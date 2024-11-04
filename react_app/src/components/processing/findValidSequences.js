export const findValidSequences = (tags, startTagName, endTagName, excludeTagNames, outputTagName) => {
  const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
  const sequences = [];
  
  sortedTags.forEach((startTag, startIndex) => {
    // Skip if this start tag falls within an existing sequence
    const isWithinExistingSequence = sequences.some(seq => 
      startTag.frame >= seq.startFrame && startTag.frame <= seq.endFrame
    );

    if (startTag.name === startTagName && !isWithinExistingSequence) {
      for (let i = startIndex + 1; i < sortedTags.length; i++) {
        const currentTag = sortedTags[i];
        
        if (currentTag.name === endTagName) {
          const hasExcludeTag = sortedTags
            .slice(startIndex + 1, i)
            .some(tag => excludeTagNames.includes(tag.name));

          if (!hasExcludeTag) {
            sequences.push({
              name: outputTagName,
              startFrame: startTag.frame,
              endFrame: currentTag.frame
            });
          }
          break;
        }
      }
    }
  });

  return sequences;
};