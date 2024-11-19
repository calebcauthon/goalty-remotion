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
    tag.name.includes('_touch_')
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

export const calculateTeamPossessions = (video, team) => {
  if (!video?.tags) return 0;
  
  // Get only touch tags for this team
  const touchTags = video.tags.filter(tag => 
    tag.name.includes('_touch_')
  );

  // Count sequences of clearing touches
  let possessionCount = 0;
  let wasClearing = false;

  touchTags.forEach(tag => {
    const isClearing = tag.name === `${team}_touch_clearing`;
    
    // If this is a clearing touch and we weren't already in a clearing sequence
    if (isClearing && !wasClearing) {
      possessionCount++;
    }
    
    wasClearing = isClearing;
  });

  return possessionCount;
};

export const calculateTeamAggregateStats = (video, team) => {
  if (!video?.tags) return null;
  
  const scores = calculateTeamScores(video, team);
  const attacks = calculateTeamAttacks(video, team);
  const possessions = calculateTeamPossessions(video, team);
  
  return {
    scores,
    attacks,
    scoringPercentage: attacks > 0 ? Math.round((scores / attacks) * 100) : 0,
    clearingTurnovers: possessions - attacks
  };
};

export const calculateTeamAttackTouches = (video, team) => {
  if (!video?.tags) return null;
  
  const touchTags = video.tags.filter(tag => 
    tag.name.includes('_touch_') || tag.name === 'score'
  );

  let totalTouches = { scoring: 0, nonScoring: 0 };
  let attackCount = { scoring: 0, nonScoring: 0 };
  let currentAttackTouches = 0;
  let inAttackSequence = false;
  let currentAttackScored = false;

  touchTags.forEach((tag, index) => {
    // Check for score during attack
    if (tag.name === 'score' && inAttackSequence) {
      currentAttackScored = true;
    }
    
    // If we find a clearing->attacking sequence, start counting a new attack
    if (tag.name === `${team}_touch_attacking` && index > 0) {
      const previousTag = touchTags[index - 1];
      if (previousTag.name === `${team}_touch_clearing`) {
        // Start new attack
        currentAttackTouches = 1;
        inAttackSequence = true;
        currentAttackScored = false;
      } else if (inAttackSequence) {
        currentAttackTouches++;
      }
    }
    // Count team touches during attack
    else if (inAttackSequence && tag.name.startsWith(`${team}_touch_`)) {
      currentAttackTouches++;
    }
    // End attack on opponent touch
    else if (inAttackSequence && tag.name.includes('_touch_') && !tag.name.startsWith(`${team}_touch_`)) {
      if (currentAttackScored) {
        totalTouches.scoring += currentAttackTouches;
        attackCount.scoring++;
      } else {
        totalTouches.nonScoring += currentAttackTouches;
        attackCount.nonScoring++;
      }
      currentAttackTouches = 0;
      inAttackSequence = false;
      currentAttackScored = false;
    }
  });

  // Add final attack if still in one
  if (inAttackSequence) {
    if (currentAttackScored) {
      totalTouches.scoring += currentAttackTouches;
      attackCount.scoring++;
    } else {
      totalTouches.nonScoring += currentAttackTouches;
      attackCount.nonScoring++;
    }
  }

  return {
    scoring: {
      totalTouches: totalTouches.scoring,
      attackCount: attackCount.scoring,
      averageTouches: attackCount.scoring > 0 ? 
        Math.round((totalTouches.scoring / attackCount.scoring) * 10) / 10 : 0
    },
    nonScoring: {
      totalTouches: totalTouches.nonScoring,
      attackCount: attackCount.nonScoring,
      averageTouches: attackCount.nonScoring > 0 ? 
        Math.round((totalTouches.nonScoring / attackCount.nonScoring) * 10) / 10 : 0
    }
  };
};

export const calculateTeamAttackDurations = (video, team) => {
  if (!video?.tags) return null;
  
  const allTags = video.tags.filter(tag => 
    tag.name.includes('_touch_') || tag.name === 'score'
  );

  let totalDuration = { scoring: 0, nonScoring: 0 };
  let attackCount = { scoring: 0, nonScoring: 0 };
  let attackStartFrame = null;
  let inAttackSequence = false;
  let currentAttackScored = false;

  allTags.forEach((tag, index) => {
    // Check for score during attack
    if (tag.name === 'score' && inAttackSequence) {
      currentAttackScored = true;
    }
    
    // Start of new attack sequence
    if (tag.name === `${team}_touch_attacking` && index > 0) {
      const previousTag = allTags[index - 1];
      if (previousTag.name === `${team}_touch_clearing`) {
        // Start new attack
        attackStartFrame = previousTag.frame;
        inAttackSequence = true;
        currentAttackScored = false;
      }
    }
    // End attack on opponent touch
    else if (inAttackSequence && tag.name.includes('_touch_') && !tag.name.startsWith(`${team}_touch_`)) {
      if (attackStartFrame !== null) {
        const duration = (tag.frame - attackStartFrame) / 30; // Convert to seconds
        if (currentAttackScored) {
          totalDuration.scoring += duration;
          attackCount.scoring++;
        } else {
          totalDuration.nonScoring += duration;
          attackCount.nonScoring++;
        }
      }
      attackStartFrame = null;
      inAttackSequence = false;
      currentAttackScored = false;
    }
  });

  // Handle final attack if still in one
  if (inAttackSequence && attackStartFrame !== null && allTags.length > 0) {
    const lastTag = allTags[allTags.length - 1];
    const duration = (lastTag.frame - attackStartFrame) / 30;
    if (currentAttackScored) {
      totalDuration.scoring += duration;
      attackCount.scoring++;
    } else {
      totalDuration.nonScoring += duration;
      attackCount.nonScoring++;
    }
  }

  return {
    scoring: {
      totalSeconds: Math.round(totalDuration.scoring * 10) / 10,
      attackCount: attackCount.scoring,
      averageSeconds: attackCount.scoring > 0 ? 
        Math.round((totalDuration.scoring / attackCount.scoring) * 10) / 10 : 0
    },
    nonScoring: {
      totalSeconds: Math.round(totalDuration.nonScoring * 10) / 10,
      attackCount: attackCount.nonScoring,
      averageSeconds: attackCount.nonScoring > 0 ? 
        Math.round((totalDuration.nonScoring / attackCount.nonScoring) * 10) / 10 : 0
    }
  };
}; 