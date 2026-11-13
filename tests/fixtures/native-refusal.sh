#!/bin/sh
case "${REFUSAL-}" in
  known) printf '%s' '{"config":{}}' ;;
  foreign)
    printf 'FOREIGN.QUARTO_ID: failure\n' >&2
    exit 17
    ;;
  *) printf '%s' 'invalid JSON' ;;
esac
