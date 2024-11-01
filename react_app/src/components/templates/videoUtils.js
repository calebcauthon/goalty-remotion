export const getVideoMetadata = (video) => {
  if (!video || !video.metadata) {
    return {
      width: 1080,  // default fallback
      height: 1080  // default fallback
    };
  }

  const metadata = typeof video.metadata === 'string' 
    ? JSON.parse(video.metadata) 
    : video.metadata;

  return {
    width: metadata.width || 1080,
    height: metadata.height || 1080
  };
}; 