#!/bin/sh
printf '%s\n' "$@" >> "$QRC_COMMANDS"
case "$1" in
  inspect) cat "$QRC_INSPECTION" ;;
  *) echo 'Неожиданный дополнительный вызов Quarto' >&2; exit 19 ;;
esac
