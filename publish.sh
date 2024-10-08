#!/bin/sh -e

version=$1

if [ -z "$version" ]; then
  echo "Version is required"
  exit 1
fi

echo "Publishing $version"

sed -i -e "s/\"version\": \".*\"/\"version\": \"$version\"/g" package.json

pnpm install
pnpm run test
pnpm run dist

git add package.json
git commit -m "Bump v$version"
git tag "v$version"
git push
git push --tags

pnpm publish
