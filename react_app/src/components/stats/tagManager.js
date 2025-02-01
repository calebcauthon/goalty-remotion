export const handleTagManagement = async (videoId, tag, APIbaseUrl) => {
  try {
    // First fetch existing video data
    const response = await fetch(`${APIbaseUrl}/api/videos/${videoId}`);
    const videoData = await response.json();
    
    // Parse existing metadata
    const metadata = videoData.metadata;
    // Parse metadata if it's a string
    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata);
    }
    const existingTags = metadata.tags || [];
    
    // Check for duplicate tag
    const isDuplicate = existingTags.some(existingTag => 
      existingTag.name === tag.name &&
      existingTag.startFrame === tag.startFrame &&
      existingTag.endFrame === tag.endFrame &&
      existingTag.type === tag.type
    );

    if (isDuplicate) {
      throw new Error('This exact tag already exists');
    }
    
    // Add new tag
    const updatedTags = [...existingTags, tag];
    
    // Update metadata with new tags
    const updatedMetadata = {
      ...metadata,
      tags: updatedTags
    };

    // Save updated metadata
    const saveResponse = await fetch(`${APIbaseUrl}/api/videos/${videoId}/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        metadata: JSON.stringify(updatedMetadata)
      })
    });

    if (!saveResponse.ok) throw new Error('Failed to save tag');
    return true;
  } catch (error) {
    console.error('Error managing tags:', error);
    alert(error.message || 'Failed to add tag');
    return false;
  }
}; 