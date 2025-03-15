export const calculateTotalTags = (video, frameRange) => {
  if (!video?.tags) return 0;
  
  // Filter tags by frame range if provided
  if (frameRange) {
    return video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }).length;
  }
  
  return video.tags.length;
};

export const calculateTeamTouches = (video, team, frameRange) => {
  if (!video?.tags) return 0;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  return tagsToUse.filter(tag => 
    tag.name.startsWith(`${team}_touch_`)
  ).length;
};

export const findTeamAttackSequences = (video, team) => {
  const home = team;
  const away = home === 'home' ? 'away' : 'home';
  if (!video?.tags) return [];
  
  const relevantTags = video.tags.filter(tag => 
    tag.name.includes('_touch_') || tag.name.includes('_clear_') || tag.name.includes('score')
  );

  const sequences = findTagSequences(
    relevantTags,
    `${home}_touch_attacking`,
    ['score', `${away}_touch_`], // End sequence on score or opponent touch
    [] // we only want the final clearing touch
  );

  return sequences
    .map(seq => {
      const touches = seq.touches;
      let finalTouch = touches[touches.length - 1];
      if (finalTouch.name.startsWith(`${away}_touch_`)) {
        touches.pop();
        finalTouch = touches[touches.length - 1];
      }
      const endFrame = finalTouch.frame;
      
      return {
        ...seq,
        endFrame,
        touches,
        scored: seq.touches.some(t => t.name === 'score')
      };
    });
};

export const calculateTeamAttacks = (video, team, frameRange) => {
  if (!video?.tags) return 0;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  return findTeamAttackSequences(videoWithFilteredTags, team).length;
};

export const calculateTeamScores = (video, team, frameRange) => {
  if (!video?.tags) return 0;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  return findTeamAttackSequences(videoWithFilteredTags, team)
    .filter(sequence => sequence.scored)
    .length;
};

export const calculateTeamAttackTouches = (video, team, frameRange) => {
  if (!video?.tags) return null;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  const sequences = findTeamAttackSequences(videoWithFilteredTags, team);
  
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

export const calculateTeamAttackDurations = (video, team, frameRange) => {
  if (!video?.tags) return null;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  const sequences = findTeamAttackSequences(videoWithFilteredTags, team);
  
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

export const calculateTeamAggregateStats = (video, team, frameRange) => {
  if (!video?.tags) return null;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  const sequences = findTeamAttackSequences(videoWithFilteredTags, team);
  const scores = sequences.filter(s => s.scored).length;
  const attacks = sequences.length;
  const possessions = calculateTeamPossessions(videoWithFilteredTags, team);
  
  return {
    scores,
    attacks,
    scoringPercentage: attacks > 0 ? Math.round((scores / attacks) * 100) : 0,
    clearingTurnovers: possessions - attacks
  };
};

export const calculateTeamPossessions = (video, team, frameRange) => {
  if (!video?.tags) return { count: 0, sequences: [] };
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const away = team === 'home' ? 'away' : 'home';
  const relevantTags = tagsToUse.filter(tag => 
    tag.name.includes('_touch_') || tag.name.includes('score')
  );
  
  const sequences = findTagSequences(
    relevantTags,
    `${team}_touch_clearing`,
    [`score`, `${away}_touch_clearing`], // End sequence on score or opponent clearing
    [] // No break conditions needed
  );

  return {
    count: sequences.length,
    sequences
  };
};

export const findTagSequences = (tags, startTagName, completeSequenceTags, breakSequenceTags = []) => {
  if (!tags) return [];
  
  const sequences = [];
  let currentSequence = null;

  // Sort tags by frame number
  const sortedTags = [...tags].sort((a, b) => a.frame - b.frame);

  sortedTags.forEach(tag => {
    if (tag.name.includes(startTagName) && !currentSequence) {
      currentSequence = {
        startFrame: tag.frame,
        endFrame: tag.frame,
        touches: [tag]
      };
    }
    else if (currentSequence) {
      if (completeSequenceTags.some(completionTag => tag.name.includes(completionTag))) {
        currentSequence.touches.push(tag);
        currentSequence.endFrame = tag.frame;
        sequences.push(currentSequence);
        currentSequence = null;
      } else if (breakSequenceTags.some(breakTag => tag.name.includes(breakTag))) {
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

export const calculateScreenSequenceTags = (tags, screenTagName) => {
  if (!tags || !screenTagName) return [];
  
  const relevantTags = tags.filter(tag => 
    tag.name.includes('_touch_') || tag.name === screenTagName
  );
  const sortedTags = [...relevantTags].sort((a, b) => a.frame - b.frame);

  const sequences = [];
  sortedTags.forEach((tag, index) => {
    if (tag.name === screenTagName) {
      const startIndex = Math.max(0, index - 2);
      const endIndex = Math.min(sortedTags.length - 1, index + 1);
      const touchSequence = sortedTags.slice(startIndex, endIndex + 1);
      
      if (touchSequence.length > 0) {
        sequences.push({
          name: `${screenTagName}_sequence`,
          startFrame: touchSequence[0].frame,
          endFrame: touchSequence[touchSequence.length - 1].frame,
          metadata: {
            touchCount: touchSequence.length,
            touches: touchSequence.map(t => ({
              name: t.name,
              frame: t.frame
            }))
          }
        });
      }
    }
  });

  return sequences;
};

export const calculateAttackSequenceTags = (tags, team) => {
  if (!tags || !team) return [];

  const newTags = [];
  const opponent = team === 'home' ? 'away' : 'home';
  let lastAttackFrame = null;

  // Filter to only include relevant tags
  const relevantTags = tags.filter(tag => 
    tag.name.includes('_touch_attacking') || 
    tag.name.includes('_touch_clearing')
  );

  for (let i = 0; i < relevantTags.length; i++) {
    const currentTag = relevantTags[i];
    const nextTag = relevantTags[i + 1];

    // Reset sequence on opponent touch
    if (currentTag.name.includes(`${opponent}_touch_`)) {
      lastAttackFrame = null;
      continue;
    }

    if (currentTag.name === `${team}_touch_attacking`) {
      lastAttackFrame = currentTag.frame;
    }

    if (lastAttackFrame && 
        nextTag?.name === `${team}_touch_clearing` && 
        currentTag.name === `${team}_touch_attacking`) {
      newTags.push({
        name: 'score',
        frame: currentTag.frame + 1
      });
      lastAttackFrame = null;
    }
  }

  return newTags;
};

export const calculateGameAggregateStats = (video, frameRange) => {
  if (!video?.tags) return null;
  
  // Filter tags by frame range if provided
  const tagsToUse = frameRange ? 
    video.tags.filter(tag => {
      const tagFrame = tag.frame || tag.startFrame;
      return tagFrame >= frameRange.startFrame && tagFrame <= frameRange.endFrame;
    }) : 
    video.tags;
  
  const videoWithFilteredTags = {
    ...video,
    tags: tagsToUse
  };

  const homeScores = calculateTeamScores(videoWithFilteredTags, 'home');
  const awayScores = calculateTeamScores(videoWithFilteredTags, 'away');
  
  const durationInSeconds = frameRange ? 
    (frameRange.endFrame - frameRange.startFrame) / 30 : 
    0;

  return {
    homeScore: homeScores,
    awayScore: awayScores,
    durationInSeconds
  };
};

export const findPlayerSequences = (video, playerName) => {
  if (!video?.boxes || !Array.isArray(video.boxes)) return [];
  
  const sequences = [];
  let currentSequence = null;
  
  console.log(video.boxes);
  video.boxes.forEach((frameData, frameNum) => {
    if (!frameData) return;
    const playerPresent = Object.keys(frameData).includes(playerName);
    
    if (playerPresent && !currentSequence) {
      currentSequence = {
        startFrame: frameNum,
        endFrame: frameNum
      };
    } else if (playerPresent && currentSequence) {
      currentSequence.endFrame = frameNum;
    } else if (!playerPresent && currentSequence) {
      // Only add sequences that are at least 3 frames long
      if (currentSequence.endFrame - currentSequence.startFrame >= 2) {
        sequences.push(currentSequence);
      }
      currentSequence = null;
    }
  });
  
  // Don't forget the last sequence if it's still open
  if (currentSequence && currentSequence.endFrame - currentSequence.startFrame >= 2) {
    sequences.push(currentSequence);
  }
  
  return sequences;
};

export function splitPlayingTimeTags(tags, playerName, team) {
  if (!tags || !playerName || !team) return [];

  const playingTags = tags.filter(tag => 
    tag.name.toLowerCase() === `${playerName.toLowerCase()} playing` &&
    tag.startFrame !== undefined &&
    tag.endFrame !== undefined
  );

  const attackTags = tags.filter(tag => {
    const isHomeTouch = tag.name.startsWith('home_touch_');
    const isAwayTouch = tag.name.startsWith('away_touch_');
    return isHomeTouch || isAwayTouch;
  });

  const newTags = [];

  for (const playingTag of playingTags) {
    // Sort attack tags that fall within this playing segment
    const relevantAttacks = attackTags
      .filter(tag => tag.frame <= playingTag.endFrame)
      .sort((a, b) => a.frame - b.frame);

    // Find the most recent touch before or at the start of the playing segment
    let lastAttackTeam = null;
    let lastAttackFrame = null;
    let segmentStart = playingTag.startFrame;

    // Find the most recent touch before the playing segment starts
    const priorTouch = relevantAttacks
      .filter(tag => tag.frame <= playingTag.startFrame)
      .pop();

    if (priorTouch) {
      lastAttackTeam = priorTouch.name.startsWith('home_touch_') ? 'home' : 'away';
      lastAttackFrame = priorTouch.frame;
    }

    // Process touches during the playing segment
    for (const attackTag of relevantAttacks.filter(tag => tag.frame >= playingTag.startFrame)) {
      const isHomeAttack = attackTag.name.startsWith('home_touch_');
      const attackingTeam = isHomeAttack ? 'home' : 'away';
      
      if (lastAttackTeam !== null && lastAttackTeam !== attackingTeam) {
        // Team possession changed, create tag for previous segment
        const isOffense = lastAttackTeam === team;
        newTags.push({
          name: `${playerName} playing ${isOffense ? 'offense' : 'defense'}`,
          startFrame: segmentStart,
          endFrame: attackTag.frame - 1
        });
        segmentStart = attackTag.frame;
      }
      
      lastAttackTeam = attackingTeam;
      lastAttackFrame = attackTag.frame;
    }

    // Handle final segment if there were any touches
    if (lastAttackTeam !== null) {
      const isOffense = lastAttackTeam === team;
      newTags.push({
        name: `${playerName} playing ${isOffense ? 'offense' : 'defense'}`,
        startFrame: segmentStart,
        endFrame: playingTag.endFrame
      });
    }
  }

  return newTags;
}

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
  calculateScreenSequenceTags,
  calculateAttackSequenceTags,
  calculateGameAggregateStats,
  findPlayerSequences,
  splitPlayingTimeTags,
};
