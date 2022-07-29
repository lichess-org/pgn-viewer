#!/bin/sh -e

version=$1

echo "Publishing $version"

sed -i -e "s/\"version\": \".*\"/\"version\": \"$version\"/g" package.json;

npm install
npm run test

git add package.json
git add package-lock.json

git commit -m "Bump v$version"

git tag "v$version"

git push
git push --tags

npm publish
