#!/bin/sh
# Maven Wrapper script
set -e
MAVEN_WRAPPER_PROPERTIES=".mvn/wrapper/maven-wrapper.properties"
DOWNLOAD_URL=$(grep distributionUrl "$MAVEN_WRAPPER_PROPERTIES" | sed 's/distributionUrl=//')
BASE_DIR=$(dirname "$(readlink -f "$0")")
MAVEN_HOME="$BASE_DIR/.mvn/wrapper/dist"
MAVEN_BIN="$MAVEN_HOME/bin/mvn"

if [ ! -f "$MAVEN_BIN" ]; then
  mkdir -p "$MAVEN_HOME"
  echo "Downloading Maven from $DOWNLOAD_URL..."
  if command -v curl > /dev/null; then
    curl -fsSL "$DOWNLOAD_URL" -o /tmp/maven.zip
  elif command -v wget > /dev/null; then
    wget -q "$DOWNLOAD_URL" -O /tmp/maven.zip
  fi
  unzip -q /tmp/maven.zip -d "$MAVEN_HOME/tmp"
  EXTRACTED=$(ls "$MAVEN_HOME/tmp")
  mv "$MAVEN_HOME/tmp/$EXTRACTED"/* "$MAVEN_HOME/"
  rm -rf "$MAVEN_HOME/tmp" /tmp/maven.zip
fi

exec "$MAVEN_BIN" "$@"
