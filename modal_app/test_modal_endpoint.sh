#!/bin/bash

# Define the endpoint URL
URL="https://calebcauthon-dev--remotion-goalty-render-video-render-video.modal.run"

# Define the JSON payload
# Replace the values with actual data
JSON_PAYLOAD=$(cat <<EOF
{
  "videos": ["SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4"],
  "props": {
    "selectedVideos":[3,6],
    "videos":[
      {"filepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","id":3,"name":"SilKCy Johnsons vs Mephis Mafia__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=pfbl8JwF2x4"}},
      {"filepath":"downloads/Silkcy Johnson vs Madison Hoopers__3-23-2024.mp4","id":6,"name":"Silkcy Johnson vs Madison Hoopers__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=ZEp2LESpFbk"}}
    ],
    "selectedTags":[{"endFrame":3017,"key":"3-home_scoring_possession-undefined-2662-3017","startFrame":2662,"tagName":"home_scoring_possession","videoFilepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","videoId":3,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"}]
  },
  "output_file_name": "output_video.mp4"
}
EOF
)

# Make the POST request
curl -X POST "$URL" \
     -H "Content-Type: application/json" \
     -d "$JSON_PAYLOAD"

# Print a message indicating the request was sent
echo "POST request sent to $URL"