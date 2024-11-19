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

export const findTeamAttackSequences = (video, team) => {
  if (!video?.tags) return [];
  
  const relevantTags = video.tags.filter(tag => 
    tag.name.includes('_touch_') || tag.name === 'score'
  );

  const sequences = [];
  let currentSequence = null;

  relevantTags.forEach((tag, index) => {
    // Start new attack sequence
    if (tag.name === `${team}_touch_attacking` && index > 0) {
      const previousTag = relevantTags[index - 1];
      if (previousTag.name === `${team}_touch_clearing`) {
        currentSequence = {
          startFrame: previousTag.frame,
          touches: [previousTag, tag],
          scored: false,
          endFrame: tag.frame
        };
      } else if (currentSequence) {
        currentSequence.touches.push(tag);
        currentSequence.endFrame = tag.frame;
      }
    }
    // Add touches to current sequence
    else if (currentSequence && tag.name.startsWith(`${team}_touch_`)) {
      currentSequence.touches.push(tag);
      currentSequence.endFrame = tag.frame;
    }
    // Check for score
    else if (currentSequence && tag.name === 'score') {
      currentSequence.scored = true;
      currentSequence.touches.push(tag);
    }
    // End sequence on opponent touch
    else if (currentSequence && tag.name.includes('_touch_') && !tag.name.startsWith(`${team}_touch_`)) {
      sequences.push(currentSequence);
      currentSequence = null;
    }
  });

  // Add final sequence if exists
  if (currentSequence) {
    sequences.push(currentSequence);
  }

  return sequences;
};

export const calculateTeamAttacks = (video, team) => {
  return findTeamAttackSequences(video, team).length;
};

export const calculateTeamScores = (video, team) => {
  return findTeamAttackSequences(video, team)
    .filter(sequence => sequence.scored)
    .length;
};

export const calculateTeamAttackTouches = (video, team) => {
  const sequences = findTeamAttackSequences(video, team);
  
  const stats = sequences.reduce((acc, sequence) => {
    const category = sequence.scored ? 'scoring' : 'nonScoring';
    acc[category].totalTouches += sequence.touches.length;
    acc[category].attackCount++;
    return acc;
  }, {
    scoring: { totalTouches: 0, attackCount: 0 },
    nonScoring: { totalTouches: 0, attackCount: 0 }
  });

  return {
    scoring: {
      ...stats.scoring,
      averageTouches: stats.scoring.attackCount > 0 ? 
        Math.round((stats.scoring.totalTouches / stats.scoring.attackCount) * 10) / 10 : 0
    },
    nonScoring: {
      ...stats.nonScoring,
      averageTouches: stats.nonScoring.attackCount > 0 ? 
        Math.round((stats.nonScoring.totalTouches / stats.nonScoring.attackCount) * 10) / 10 : 0
    }
  };
};

export const calculateTeamAttackDurations = (video, team) => {
  const sequences = findTeamAttackSequences(video, team);
  
  const stats = sequences.reduce((acc, sequence) => {
    const category = sequence.scored ? 'scoring' : 'nonScoring';
    const duration = Math.round((sequence.endFrame - sequence.startFrame) / 30);
    acc[category].totalSeconds += duration;
    acc[category].attackCount++;
    return acc;
  }, {
    scoring: { totalSeconds: 0, attackCount: 0 },
    nonScoring: { totalSeconds: 0, attackCount: 0 }
  });

  return {
    scoring: {
      ...stats.scoring,
      averageSeconds: stats.scoring.attackCount > 0 ? 
        Math.round((stats.scoring.totalSeconds / stats.scoring.attackCount) * 10) / 10 : 0
    },
    nonScoring: {
      ...stats.nonScoring,
      averageSeconds: stats.nonScoring.attackCount > 0 ? 
        Math.round((stats.nonScoring.totalSeconds / stats.nonScoring.attackCount) * 10) / 10 : 0
    }
  };
};

export const calculateTeamAggregateStats = (video, team) => {
  const sequences = findTeamAttackSequences(video, team);
  const scores = sequences.filter(s => s.scored).length;
  const attacks = sequences.length;
  const possessions = calculateTeamPossessions(video, team);
  
  return {
    scores,
    attacks,
    scoringPercentage: attacks > 0 ? Math.round((scores / attacks) * 100) : 0,
    clearingTurnovers: possessions - attacks
  };
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

export const findTagSequences = (tags, startTagName, completeSequenceTags, breakSequenceTags = []) => {
  if (!tags) return [];
  
  const sequences = [];
  let currentSequence = null;

  tags.forEach(tag => {
    if (tag.name === startTagName && !currentSequence) {
      currentSequence = {
        startFrame: tag.frame,
        endFrame: tag.frame,
        touches: [tag]
      };
    }
    else if (currentSequence) {
      if (completeSequenceTags.includes(tag.name)) {
        currentSequence.touches.push(tag);
        currentSequence.endFrame = tag.frame;
        sequences.push(currentSequence);
        currentSequence = null;
      } else if (breakSequenceTags.includes(tag.name)) {
        currentSequence = null;
      } else {
        currentSequence.touches.push(tag);
        currentSequence.endFrame = tag.frame;
      }
    }
  });

  return sequences;
};

export const findTurnoverSequences = (tags, teamTouchPrefix, maxPrecedingTouches = 3) => {
  if (!tags) return [];
  
  const opposingTouchPrefix = teamTouchPrefix.startsWith('home') ? 'away_touch_' : 'home_touch_';
  const homeAttack = `${teamTouchPrefix}attacking`;
  const awayClear = `${opposingTouchPrefix}clearing`;
  
  // First find sequences that start with attacking touch and end with opponent's clearing touch
  const turnoverSequences = findTagSequences(
    tags,
    homeAttack,
    [awayClear],
    ["score"]
  );
  
  return turnoverSequences.map(sequence => {
    const touches = sequence.touches;
    touches.pop();

    // Respect maxPrecedingTouches by taking only the last N touches
    if (touches.length > maxPrecedingTouches) {
      touches.splice(0, touches.length - maxPrecedingTouches);
    }

    return {
      startFrame: touches[0].frame,
      endFrame: touches[touches.length - 1].frame,
      metadata: { touches }
    };
  });
};

export const calculateScoringPossessionTags = (tags, home) => {
  if (!tags) return [];
  
  const away = home == "home" ? "away" : "home";

  const relevantTags = tags.filter(tag => 
    tag.name.includes("_touch_") ||
    tag.name.includes("score")
  );

  const sequences = findTagSequences(
    relevantTags,
    `${home}_touch_attacking`,
    [`${home}_score`],
    [`${away}_touch_clearing`, `${away}_touch_attacking`]
  );

  return sequences.map(seq => ({
    name: `${home}_scoring_possession`,
    startFrame: seq.startFrame,
    endFrame: seq.endFrame,
    metadata: {
      touchCount: seq.touches.length,
      touches: seq.touches.map(t => ({
        name: t.name,
        frame: t.frame
      }))
    }
  }));
};

export const calculatePlayingTimeTags = (tags, playerName) => {
  if (!tags || !playerName) return [];

  const playerTags = tags.filter(tag => tag.name.includes(playerName));

  const sequences = findTagSequences(
    playerTags,
    `${playerName} IN`,
    [`${playerName} OUT`],
    [`${playerName} OUT`]
  );

  return sequences.map(seq => ({
    name: `${playerName} playing`,
    startFrame: seq.startFrame,
    endFrame: seq.endFrame,
    metadata: {
      touchCount: seq.touches.length,
      touches: seq.touches.map(t => ({
        name: t.name,
        frame: t.frame
      }))
    }
  }));
};

export const findGameSequences = (tags) => {
  const sequences = [];
  const sortedTags = [...tags].sort((a, b) => a.startFrame - b.startFrame);
  
  sortedTags.forEach((startTag, startIndex) => {
    if (startTag.name === 'game_start') {
      for (let i = startIndex + 1; i < sortedTags.length; i++) {
        const endTag = sortedTags[i];
        if (endTag.name === 'game_end') {
          sequences.push({
            startFrame: startTag.frame,
            endFrame: endTag.frame,
            metadata: {
              gameNumber: sequences.length + 1,
              duration: endTag.frame - startTag.frame
            }
          });
          break;
        }
      }
    }
  });
  
  return sequences;
};

export default {
  calculateTeamAttacks,
  calculateTeamScores,
  calculateTeamAttackTouches,
  calculateTeamAttackDurations,
  calculateTeamAggregateStats,
  calculateTeamPossessions,
  findTeamAttackSequences,
  findTagSequences,
  findTurnoverSequences,
  calculateScoringPossessionTags,
  calculatePlayingTimeTags,
  findGameSequences,
};
