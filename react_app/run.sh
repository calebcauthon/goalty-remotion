nvm use 18
echo "🔧 Remember to run 'nvm use 18' if you haven't already! 🚀"


echo "🚀 Running: export \$(cat .react.local | xargs) && npm run start"
export $(cat .react.local | xargs) && npm run start
