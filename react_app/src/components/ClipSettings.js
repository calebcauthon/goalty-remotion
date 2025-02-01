import React from 'react';
import { VideoPlayerTrackingSettings } from 'components/templates';
import './ClipSettings.css';

const getPlayersInFrameRange = (metadata, startFrame, endFrame) => {
  if (!metadata?.boxes) return new Set();
  
  const players = new Set();
  metadata.boxes.forEach(box => {
    if (!box) return;
    Object.entries(box).forEach(([player, data]) => {
      const frame = data.frame;
      if (frame >= startFrame && frame <= endFrame) {
        players.add(player);
      }
    });
  });
  return players;
};

export const ClipSettings = ({
  clip,
  videos,
  clipSettings,
  onSettingChange
}) => {
  const video = videos.find(v => v.id === clip.videoId);
  const metadata = video?.metadata ? 
    (typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata) 
    : null;
  
  const players = getPlayersInFrameRange(metadata, clip.startFrame, clip.endFrame);

  return (
    <tr className="settings-row">
      <td colSpan="8">
        <div className="clip-settings">
          {Object.entries(VideoPlayerTrackingSettings).map(([key, setting]) => {
            if (setting.type === 'playerGroup') {
              return Array.from(players).map(player => (
                <div key={`${player}-settings`} className="player-settings-group">
                  <h4>{player}</h4>
                  {Object.entries(setting.perPlayer).map(([settingKey, settingConfig]) => (
                    <div key={`${player}-${settingKey}`} className="setting-item">
                      <label>{settingConfig.label}:</label>
                      <input
                        type={settingConfig.type}
                        min={settingConfig.type === 'range' ? (settingConfig.min ?? 0) : undefined}
                        max={settingConfig.type === 'range' ? (settingConfig.max ?? 1) : undefined}
                        step={settingConfig.type === 'range' ? (settingConfig.step ?? 0.1) : undefined}
                        checked={settingConfig.type === 'checkbox' ? 
                          (clipSettings[clip.key]?.playerSettings?.[player]?.[settingKey] ?? settingConfig.default) : 
                          undefined
                        }
                        value={settingConfig.type !== 'checkbox' ?
                          (clipSettings[clip.key]?.playerSettings?.[player]?.[settingKey] ?? settingConfig.default) :
                          undefined
                        }
                        onChange={(e) => {
                          const value = settingConfig.type === 'range' ? 
                            Number(e.target.value) : 
                            settingConfig.type === 'checkbox' ?
                              e.target.checked :
                              e.target.value;
                          onSettingChange(
                            clip.key, 
                            'playerSettings', 
                            {
                              ...clipSettings[clip.key]?.playerSettings,
                              [player]: {
                                ...clipSettings[clip.key]?.playerSettings?.[player],
                                [settingKey]: value
                              }
                            }
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              ));
            }
            
            // Regular settings
            return (
              <div key={key} className="setting-item">
                <label>{setting.label}:</label>
                <input
                  type={setting.type}
                  min={setting.min ?? 0}
                  max={setting.max ?? 1}
                  step={setting.step ?? 0.1}
                  value={
                    (clipSettings[clip.key]?.[key] ?? setting.default)
                  }
                  onChange={(e) => {
                    const value = setting.type === 'range' ? 
                      Number(e.target.value) : 
                      e.target.value;
                    onSettingChange(clip.key, key, value);
                  }}
                />
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}; 