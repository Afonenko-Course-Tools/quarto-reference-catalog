#!/bin/sh
printf 'PRIVATE_STDOUT\n'
case "${MODE-}" in
  failure)
    printf 'WARNING: PRIVATE_FAILURE\n' >&2
    exit 23
    ;;
  warning) printf 'WARNING: PRIVATE_WARNING\n' >&2 ;;
  *) printf 'PRIVATE_STDERR\n' >&2 ;;
esac
