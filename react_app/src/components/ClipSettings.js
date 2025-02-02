import React, { useState } from 'react';
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
  const [settingsClipboard, setSettingsClipboard] = useState(null);
  
  const video = videos.find(v => v.id === clip.videoId);
  const metadata = video?.metadata ? 
    (typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata) 
    : null;
  
  const players = getPlayersInFrameRange(metadata, clip.startFrame, clip.endFrame);

  return (
    <tr className="settings-row">
      <td colSpan="8">
        <div className="clip-settings">
          <div className="regular-settings">
            {Object.entries(VideoPlayerTrackingSettings).map(([key, setting]) => {
              if (setting.type === 'playerGroup') return null;
              
              return (
                <div key={key} className="setting-item">
                  <label>{setting.label}:</label>
                  <input
                    type={setting.type}
                    min={setting.min ?? 0}
                    max={setting.max ?? 1}
                    step={setting.step ?? 0.1}
                    value={clipSettings[clip.key]?.[key] ?? setting.default}
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

          {Object.entries(VideoPlayerTrackingSettings).map(([key, setting]) => {
            if (setting.type !== 'playerGroup') return null;
            
            return Array.from(players).map(player => (
              <div key={`${player}-settings`} className="player-settings-group">
                <div className="player-settings-header">
                  <h4>{player}</h4>
                  <div className="player-settings-controls">
                    <button
                      onClick={() => {
                        const playerSettings = clipSettings[clip.key]?.playerSettings?.[player] || {};
                        setSettingsClipboard(playerSettings);
                      }}
                      className="copy-paste-btn"
                      title="Copy settings"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => {
                        if (!settingsClipboard) return;
                        onSettingChange(
                          clip.key,
                          'playerSettings',
                          {
                            ...clipSettings[clip.key]?.playerSettings,
                            [player]: { ...settingsClipboard }
                          }
                        );
                      }}
                      className="copy-paste-btn"
                      disabled={!settingsClipboard}
                      title="Paste settings"
                    >
                      📝 Paste
                    </button>
                  </div>
                </div>
                {Object.entries(setting.perPlayer).map(([settingKey, settingConfig]) => {
                  if (settingKey === 'useCustomSettings') {
                    return (
                      <div key={`${player}-${settingKey}`} className="setting-item">
                        <label>{settingConfig.label}:</label>
                        <input
                          type="checkbox"
                          checked={clipSettings[clip.key]?.playerSettings?.[player]?.[settingKey] ?? settingConfig.default}
                          onChange={(e) => {
                            const useCustom = e.target.checked;
                            
                            const newPlayerSettings = {
                              ...clipSettings[clip.key]?.playerSettings?.[player],
                              useCustomSettings: useCustom
                            };

                            if (useCustom) {
                              newPlayerSettings.customBoxColor = clipSettings[clip.key]?.boundingBoxColor ?? VideoPlayerTrackingSettings.boundingBoxColor.default;
                              newPlayerSettings.customNameColor = clipSettings[clip.key]?.playerNameColor ?? VideoPlayerTrackingSettings.playerNameColor.default;
                              newPlayerSettings.customNameBgColor = clipSettings[clip.key]?.playerNameBgColor ?? VideoPlayerTrackingSettings.playerNameBgColor.default;
                              newPlayerSettings.customBoxOpacity = clipSettings[clip.key]?.boundingBoxOpacity ?? VideoPlayerTrackingSettings.boundingBoxOpacity.default;
                              newPlayerSettings.customNameOpacity = clipSettings[clip.key]?.playerNameOpacity ?? VideoPlayerTrackingSettings.playerNameOpacity.default;
                            }

                            onSettingChange(
                              clip.key,
                              'playerSettings',
                              {
                                ...clipSettings[clip.key]?.playerSettings,
                                [player]: newPlayerSettings
                              }
                            );
                          }}
                        />
                      </div>
                    );
                  }

                  return (
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
                  );
                })}
              </div>
            ));
          })}
        </div>
      </td>
    </tr>
  );
}; 