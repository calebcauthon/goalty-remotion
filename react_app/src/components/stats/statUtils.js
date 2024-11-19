export const calculateTotalTags = (video) => {
  if (!video?.tags) return 0;
  return video.tags.length;
};

export const calculateTeamTouches = (video, team) => {
  if (!video?.tags) return 0;
  return video.tags.filter(tag => 
    tag.name.startsWith(`${team}_touch_`)
  ).length;
};

export const calculateTeamScores = (video, team) => {
  if (!video?.tags) return 0;
  return video.tags.reduce((count, tag, index, tags) => {
    if (tag.name === 'score') {
      for (let i = index - 1; i >= 0; i--) {
        const previousTag = tags[i];
        if (previousTag.name.endsWith('_touch_attacking')) {
          if (previousTag.name === `${team}_touch_attacking`) {
            return count + 1;
          }
          break;
        }
      }
    }
    return count;
  }, 0);
};

export const calculateTeamAttacks = (video, team) => {
  if (!video?.tags) return 0;
  const touchTags = video.tags.filter(tag => 
    tag.name.startsWith(`${team}_touch_`)
  );

  return touchTags.reduce((count, tag, index, tags) => {
    if (tag.name === `${team}_touch_attacking` && index > 0) {
      const previousTag = tags[index - 1];
      if (previousTag.name === `${team}_touch_clearing`) {
        return count + 1;
      }
    }
    return count;
  }, 0);
}; 