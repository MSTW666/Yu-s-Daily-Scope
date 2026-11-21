#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
xcodegen generate
xcodebuild -project YuDailyScope.xcodeproj -scheme YuDailyScope -configuration Release -sdk iphoneos -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
mkdir -p package/Payload
cp -R build/Build/Products/Release-iphoneos/YuDailyScope.app package/Payload/
cd package
zip -qry ../YuDailyScope.ipa Payload
