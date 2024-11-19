export const handleTagApproval = async (selectedVideo, proposedTags, APIbaseUrl) => {
  if (!selectedVideo || proposedTags.length === 0) return false;

  try {
    const metadata = selectedVideo.metadata ? JSON.parse(selectedVideo.metadata) : {};
    const existingTags = metadata.tags || [];
    const updatedTags = [...existingTags, ...proposedTags];

    const response = await fetch(`${APIbaseUrl}/api/videos/${selectedVideo.id}/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: JSON.stringify({ ...metadata, tags: updatedTags })
      }),
    });

    if (!response.ok) throw new Error('Failed to save tags');
    return true;
  } catch (error) {
    console.error('Error saving proposed tags:', error);
    return false;
  }
}; 