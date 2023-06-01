#! /bin/sh
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR/website
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
