#!/usr/bin/env bash
# Sincroniza as branches locais com o GitHub no início de cada sessão do Claude Code.
# Só faz fast-forward: nunca sobrescreve commits ou alterações locais.

cd "$(dirname "$0")/../.." || exit 0

# Usa o login do GitHub CLI, se houver, para não pedir usuário/senha
git_() { git -c credential.helper= -c credential.helper='!gh auth git-credential' "$@"; }

avisar() {
  jq -n --arg m "Git: $1" '{systemMessage: $m, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $m}}'
}

if ! git_ fetch --quiet --prune origin 2>/dev/null; then
  avisar "não foi possível acessar o GitHub; branches locais não foram atualizadas."
  exit 0
fi

atual=$(git symbolic-ref --short -q HEAD)
msgs=()

for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do
  up=$(git rev-parse --abbrev-ref -q "$b@{u}" 2>/dev/null) || continue
  atras=$(git rev-list --count "$b..$up")
  frente=$(git rev-list --count "$up..$b")

  if [ "$atras" -eq 0 ]; then
    [ "$frente" -gt 0 ] && msgs+=("$b tem $frente commit(s) ainda não enviado(s)")
    continue
  fi
  if [ "$frente" -gt 0 ]; then
    msgs+=("$b divergiu do GitHub ($frente local, $atras remoto); não foi alterada")
    continue
  fi

  if [ "$b" = "$atual" ]; then
    if git merge --ff-only --quiet "$up" >/dev/null 2>&1; then
      msgs+=("$b atualizada (+$atras commit(s))")
    else
      msgs+=("$b está $atras commit(s) atrás, mas há alterações locais que impedem atualizar")
    fi
  else
    git fetch --quiet . "$up:$b" 2>/dev/null && msgs+=("$b atualizada (+$atras commit(s))")
  fi
done

if [ ${#msgs[@]} -gt 0 ]; then
  avisar "$(IFS='; '; echo "${msgs[*]}")"
fi
exit 0
