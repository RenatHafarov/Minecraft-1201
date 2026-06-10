#!/usr/bin/env sh
set -eu

# Forge requires a configured set of both JVM and program arguments.
# Add custom JVM arguments to the user_jvm_args.txt
# Add custom program arguments {such as nogui} to this file in the next line before the "$@" or
#  pass them to this script directly
cd "$(dirname "$0")"

FORGE_ARGS="libraries/net/minecraftforge/forge/1.20.1-47.4.10/unix_args.txt"

if [ ! -f "$FORGE_ARGS" ]; then
  echo "Forge argfile not found: $FORGE_ARGS" >&2
  echo "Check that the full libraries/ directory exists in /root/server." >&2
  echo "If libraries/ is missing, run the Forge 1.20.1-47.4.10 installer with --installServer or upload libraries/ from the prepared server folder." >&2
  exit 1
fi

exec java @user_jvm_args.txt @"$FORGE_ARGS" "$@"
